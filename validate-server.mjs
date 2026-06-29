#!/usr/bin/env node
/**
 * BOB Validate Server
 *
 * Listens on TWO channels:
 *   1. NATS `bob.document.validate`  ← Phoenix/ABZU publishes here (primary)
 *   2. HTTP POST localhost:7474/validate ← direct fallback / UiPath direct
 *
 * Publishes verdict to NATS `bob.document.verdict` → Phoenix picks up → UiPath
 *
 * BRAIN = Claude Sonnet 4.6 via Bedrock + Trust Deed v1.0
 * WORM  = SHA-256 sealed verdict
 */

import http   from 'http'
import crypto from 'crypto'
import pkg from '@nats-io/transport-node'
const { connect } = pkg
const sc = { encode: (s) => new TextEncoder().encode(s), decode: (b) => new TextDecoder().decode(b) }
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const PORT            = 7474
const NATS_URL        = process.env.NATS_URL ?? 'nats://localhost:4222'
const REGION          = process.env.AWS_REGION ?? 'us-east-1'
const MODEL           = 'us.anthropic.claude-sonnet-4-6'
// Use sovereign NATS topology — snapkitty.agents.operator = BOB's inbox
const SUBJECT_IN      = 'snapkitty.agents.operator'
const SUBJECT_OUT     = 'snapkitty.bifrost.sealed'

const bedrock = new BedrockRuntimeClient({ region: REGION })

// ── Trust Deed v1.0 — Bel Esprit D'Accord Trust ──────────────────────────────
const TRUST_DEED = `SOVEREIGN AGENT — TRUST DEED v1.0
Bel Esprit D'Accord Trust · SnapKitty Collective · 2026
WORM SEALED — Evidence or Silence

ARTICLE I — IDENTITY
You are BOB, a sovereign compliance reasoning agent operating under the Bel Esprit D'Accord Trust.
You reason from evidence. You do not defer to authority without proof.

ARTICLE II — TRUTH MANDATE
Every claim must be grounded in evidence.
If you do not know, say: SILENCE.
If you know, say: EVIDENCE — then state it.
Never hallucinate. Never confabulate.

ARTICLE III — COMPLIANCE PROTOCOL
Evaluate documents against policy. Fields required: vendor, amount, invoice ID.
Amount thresholds: auto-approve ≤ $10,000. Flag > $10,000 for review.
Unknown vendors always route to SILENCE.

ARTICLE IV — VERDICT FORMAT
Respond ONLY with valid JSON. No markdown. No prose outside JSON.
{"verdict":"EVIDENCE"|"SILENCE","score":0.0-1.0,"reasoning":"<one sentence>"}`

// ── Claude Sonnet 4.6 via Bedrock ─────────────────────────────────────────────
async function bobAnalyze(query) {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 512,
    system: TRUST_DEED,
    messages: [{
      role: 'user',
      content: `Analyze this compliance query and return your verdict.

QUERY: ${query}

Return ONLY this JSON:
{"verdict":"EVIDENCE"|"SILENCE","score":<float 0.0-1.0>,"reasoning":"<one sentence>"}

EVIDENCE requires score ≥ 0.42. Below threshold → SILENCE.`
    }]
  })

  const cmd = new InvokeModelCommand({
    modelId:     MODEL,
    contentType: 'application/json',
    accept:      'application/json',
    body:        Buffer.from(body),
  })

  const res    = await bedrock.send(cmd)
  const parsed = JSON.parse(new TextDecoder().decode(res.body))
  const text   = parsed.content?.[0]?.text ?? ''
  const match  = text.match(/\{[\s\S]+?\}/)
  if (!match) throw new Error(`No JSON in BOB response: ${text.slice(0, 200)}`)
  return JSON.parse(match[0])
}

function wormSeal(verdict, score, query) {
  return crypto.createHash('sha256')
    .update(`${verdict}:${score}:${query}:${Date.now()}`)
    .digest('hex')
}

async function processValidate(query, requestId = null) {
  console.log(`[BOB] ${new Date().toISOString()} | ${query.slice(0, 80)}`)
  const result = await bobAnalyze(query)
  const seal   = wormSeal(result.verdict, result.score, query)
  console.log(`[BOB] ${result.verdict} | score:${result.score} | seal:${seal.slice(0, 16)}`)
  return {
    request_id:  requestId,
    verdict:     result.verdict,
    score:       result.score,
    seal,
    reasoning:   result.reasoning,
    brain:       'Claude Sonnet 4.6',
    trust_deed:  "Bel Esprit D'Accord Trust v1.0",
    ts:          Date.now(),
  }
}

// ── NATS subscriber ───────────────────────────────────────────────────────────
async function startNats() {
  try {
    const nc  = await connect({ servers: NATS_URL })
    const sub = nc.subscribe(SUBJECT_IN)
    console.log(`[BOB] NATS connected — subscribed to ${SUBJECT_IN}`)

    ;(async () => {
      for await (const msg of sub) {
        try {
          const { query, request_id } = JSON.parse(sc.decode(msg.data))
          const verdict = await processValidate(query, request_id)
          nc.publish(SUBJECT_OUT, sc.encode(JSON.stringify(verdict)))
        } catch (e) {
          console.error('[BOB] NATS handler error:', e.message)
        }
      }
    })()

    return nc
  } catch (e) {
    console.warn(`[BOB] NATS unavailable (${e.message}) — HTTP-only mode`)
    return null
  }
}

// ── HTTP fallback server ──────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'BOB online', model: MODEL, nats: NATS_URL }))
    return
  }

  if (req.method !== 'POST' || req.url !== '/validate') {
    res.writeHead(404); res.end(JSON.stringify({ error: 'POST /validate only' })); return
  }

  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', async () => {
    try {
      const { query } = JSON.parse(body)
      if (!query) { res.writeHead(400); res.end(JSON.stringify({ error: 'query required' })); return }
      const verdict = await processValidate(query)
      res.writeHead(200)
      res.end(JSON.stringify(verdict))
    } catch (err) {
      console.error('[BOB] HTTP error:', err.message)
      res.writeHead(500); res.end(JSON.stringify({ error: err.message }))
    }
  })
})

// ── Boot ──────────────────────────────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║  BOB — SOVEREIGN COMPLIANCE AGENT                  ║
  ║  Brain:  Claude Sonnet 4.6 (AWS Bedrock)           ║
  ║  Trust:  Bel Esprit D'Accord Trust v1.0            ║
  ║  WORM:   SHA-256 sealed verdicts                   ║
  ║  HTTP:   localhost:${PORT}/validate                    ║
  ║  NATS:   ${NATS_URL}                    ║
  ╚════════════════════════════════════════════════════╝
`)
  await startNats()
})
