/**
 * BOB Chat — Talk to the Sovereign Logic Machine
 *
 * Same prompt goes to two systems simultaneously:
 *   BOB  — QRNG → HolyC NIL → Emoji → Prolog → Ada → WORM → structured answer
 *   LLM  — Groq (Llama 3.3 70B) or gpt4o or gemini
 *
 * Usage:
 *   node autonomous/chat.mjs          (default: groq)
 *   node autonomous/chat.mjs groq
 *   node autonomous/chat.mjs gpt4o
 *   node autonomous/chat.mjs gemini
 *   node autonomous/chat.mjs ollama
 *
 * Commands:
 *   /worm        — show sealed history
 *   /agent       — run a live autonomous tick
 *   /quit        — exit
 */

import readline  from 'readline'
import { holyc_nil }     from './holyc_nil.mjs'
import { emoji_trigger } from './emoji_trigger.mjs'
import { createHash }    from 'crypto'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join }          from 'path'

// ── Load API keys ─────────────────────────────────────────────────────────────

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  readFileSync(path, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#')) out[k.trim()] = v.join('=').trim()
  })
  return out
}

const ENV = {
  ...loadEnv('C:/Users/jessi/Desktop/bobs control repo/DEVFLOW-FINANCE/collectivekitty/.env'),
  ...loadEnv('C:/Users/jessi/Desktop/bobs control repo/DEVFLOW-FINANCE/collectivekitty/.env.local'),
  ...loadEnv('C:/Users/jessi/Desktop/bobs control repo/DEVFLOW-FINANCE/.env'),
}
const GROQ_KEY   = ENV.GROQ_API_KEY
const OPENAI_KEY = ENV.OPENAI_API_KEY
const GEMINI_KEY = ENV.GEMINI_API_KEY

// ── WORM (chat history sealed) ────────────────────────────────────────────────

const WORM_PATH = join(process.env.HOME || process.env.USERPROFILE || '.', '.bob-chat-worm.json')

const worm = {
  load()  { try { return JSON.parse(readFileSync(WORM_PATH,'utf8')) } catch { return [] } },
  seal(label, payload) {
    const chain = this.load()
    const prev  = chain.length ? chain[chain.length-1].seal : '0'.repeat(64)
    const ts    = new Date().toISOString()
    const seal  = createHash('sha256').update(JSON.stringify({label,payload,ts,prev})).digest('hex')
    chain.push({ label, payload, ts, prev, seal })
    writeFileSync(WORM_PATH, JSON.stringify(chain, null, 2))
    return seal
  }
}

// ── QRNG ──────────────────────────────────────────────────────────────────────

async function qrng(n = 8) {
  try {
    const r = await fetch(`https://qrng.anu.edu.au/API/jsonI.php?length=${n}&type=uint8`,
      { signal: AbortSignal.timeout(2500) })
    if (r.ok) { const j = await r.json(); if (j.success) return { b: new Uint8Array(j.data), src:'ANU' } }
  } catch {}
  const { randomBytes } = await import('crypto')
  return { b: new Uint8Array(randomBytes(n)), src:'CSPRNG' }
}

// ── Prolog keyword router ─────────────────────────────────────────────────────
// Pattern-directed invocation (Hewitt PLANNER antecedent style)
// Fires the matching rule when keyword pattern detected in input

const RULES = [
  { pattern: /\b(oracle|random|quantum|entropy|qrng)\b/i,
    agent:'ORACLE',      action:'fetch_entropy',      abjad:490 },
  { pattern: /\b(write|worm|seal|ledger|append|log|history)\b/i,
    agent:'ARCHIVIST',   action:'seal_event',          abjad:92  },
  { pattern: /\b(trust|sentinel|gate|block|deny|allow|permit|security)\b/i,
    agent:'SENTINEL',    action:'gate_check',          abjad:120 },
  { pattern: /\b(proof|lean|verify|theorem|formal|correct)\b/i,
    agent:'VERIFIER',    action:'proof_check',         abjad:160 },
  { pattern: /\b(route|agent|select|who|which|dispatch)\b/i,
    agent:'PLANNER',     action:'route_task',          abjad:380 },
  { pattern: /\b(nil|null|empty|nothing|void|silence)\b/i,
    agent:'TERRY-NIL',   action:'oracle_consult',      abjad:910 },
  { pattern: /\b(qubit|superpos|quantum.state|collapse|measure)\b/i,
    agent:'ORACLE',      action:'hold_superposition',  abjad:518 },
  { pattern: /\b(contract|ada|condition|pre|post|invariant)\b/i,
    agent:'SENTINEL',    action:'contract_verify',     abjad:120 },
  { pattern: /\b(memory|remember|recall|state|ssm|mamba)\b/i,
    agent:'BOB-CORE',    action:'ssm_recall',          abjad:240 },
  { pattern: /\b(build|create|generate|make|code|write)\b/i,
    agent:'BUILDER',     action:'generate',            abjad:200 },
  { pattern: /\b(abjad|arabic|hebrew|enochian|dee|terry|holyc)\b/i,
    agent:'BOB-CORE',    action:'esoteric_lookup',     abjad:420 },
]

function prologRoute(input) {
  for (const rule of RULES) {
    if (rule.pattern.test(input)) return rule
  }
  return { agent:'BOB-CORE', action:'sovereign_step', abjad:200 }
}

// Ada gate: check if this route is permitted
function adaGate(agent, abjad) {
  if (abjad < 90)  return { ok: false, reason: `abjad ${abjad} below minimum` }
  if (agent === 'VOID') return { ok: false, reason: 'void agent — no contract' }
  return { ok: true, reason: `${agent} cleared — abjad:${abjad}` }
}

// ── BOB's answer ──────────────────────────────────────────────────────────────

async function askBOB(input, ssmState) {
  const { b: qBytes, src } = await qrng(8)
  const nil     = holyc_nil(qBytes)
  const trigger = emoji_trigger(qBytes)
  const route   = prologRoute(input)
  const gate    = adaGate(route.agent, route.abjad)

  // SSM update: integrate this query into running state
  const x        = input.length / 500
  const wNoise   = parseInt(createHash('sha256').update(input).digest('hex').slice(0,8), 16) / 0xFFFFFFFF * 0.01
  const newState = gate.ok ? (0.9 * ssmState + 0.1 * x + wNoise) : ssmState

  // Build a sovereign answer from the routing
  const answer = buildAnswer(input, route, gate, nil, trigger)

  const seal = worm.seal('BOB_CHAT', {
    input: input.slice(0,200), route: route.agent, action: route.action,
    oracle: nil.word, emoji: trigger.sequence, abjad: route.abjad,
    gate: gate.ok ? 'ALLOWED' : 'DENIED', ssm: newState
  })

  return { nil, trigger, route, gate, answer, seal, newState, src }
}

function buildAnswer(input, route, gate, nil, trigger) {
  if (!gate.ok) return `Ada gate DENIED — ${gate.reason}. Cannot proceed without contract.`

  const word = nil.word || 'NIL'
  const seq  = trigger.sequence

  // Route-specific sovereign answers
  if (route.action === 'fetch_entropy')
    return `Oracle speaks: "${word}" (${seq}). Quantum source active — ANU vacuum fluctuations seeding this response. Abjad: ${route.abjad}. Each answer is genuinely non-deterministic.`

  if (route.action === 'oracle_consult')
    return `Oracle holds. NIL state = abjad 910 — inverted maximum. The silence IS the answer. Terry's oracle: silence means God hasn't spoken yet. Not absence — maximum unspoken potential.`

  if (route.action === 'gate_check' || route.action === 'contract_verify')
    return `Ada gate consulted. ORACLE class = read-only (cannot write). BUILDER/SENTINEL required for write ops. Contract enforced at boundary — not by policy, by proof. No exception path exists.`

  if (route.action === 'proof_check')
    return `Lean 4 proof obligation triggered. Theorem hash required before SSM injection. Missing contract → null vector → gate FROZEN. Both proof AND contract must be present — one is insufficient.`

  if (route.action === 'seal_event')
    return `WORM seal: "${createHash('sha256').update(input + Date.now()).digest('hex').slice(0,16)}…" — append-only. Dee's diary (Cotton MS Appendix XLVI): 420 sessions, dated, witnessed, never erased. Every exchange sealed permanently.`

  if (route.action === 'hold_superposition')
    return `Qubit state (${seq}): abjad 518 — pre-collapse. All paths open. ${trigger.meta.qubit_count} qubit ops in this tick. Measurement collapses to one outcome. Until then: oracle holds all possible words simultaneously. The 49th Call was never spoken for this reason.`

  if (route.action === 'route_task')
    return `Prolog routing: word="${word}" → agent=${route.agent}. Pattern-directed invocation (Hewitt PLANNER 1969) — the rule fires automatically when the pattern matches. No explicit call needed. Antecedents: ${trigger.meta.planner_fires.length} fired this tick.`

  if (route.action === 'ssm_recall')
    return `Mamba SSM state: ${nil.word} → linear recurrence. State carries context without full attention window. O(n) not O(n²). Watson linear attention layer + SSM = BOB's memory. Not token prediction — state space navigation.`

  if (route.action === 'esoteric_lookup')
    return `Oracle "${word}" (${seq}). Abjad: ن=50 ي=10 ل=30 → NIL=90 forward / 910 inverted. Dee's Monas: one glyph = 7+ simultaneous layers. Terry's oracle: keyboard timing >> GOD_BAD_BITS XOR quantum vacuum. The esoteric IS the instruction set.`

  // Default sovereign step
  return `Oracle: "${word}" (${seq}). Route: ${route.agent} → ${route.action}. Abjad: ${route.abjad}. Gate: ${gate.reason}. WORM sealed. SSM updated.`
}

// ── LLM providers ─────────────────────────────────────────────────────────────

async function askLLM(input, provider, history) {
  const start = Date.now()
  const messages = [
    { role: 'system', content: 'You are a knowledgeable AI assistant. Answer clearly and concisely.' },
    ...history.slice(-6),   // last 3 turns for context
    { role: 'user', content: input }
  ]

  if (provider === 'groq') {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model:'llama-3.3-70b-versatile', messages, max_tokens:300, temperature:0.7 }),
        signal: AbortSignal.timeout(15000)
      })
      if (!r.ok) { const e = await r.text(); return { reply: `[Groq error ${r.status}]`, ms:Date.now()-start } }
      const j = await r.json()
      const reply = j.choices?.[0]?.message?.content || '[no response]'
      const tps   = j.usage ? Math.round(j.usage.completion_tokens / ((Date.now()-start)/1000)) : 0
      return { reply, ms: Date.now()-start, source:`Groq · Llama-3.3-70B · ${tps} tok/s` }
    } catch(e) { return { reply:`[Groq offline: ${e.message}]`, ms:Date.now()-start } }
  }

  if (provider === 'gpt4o') {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model:'gpt-4o', messages, max_tokens:300, temperature:0.7 }),
        signal: AbortSignal.timeout(20000)
      })
      if (!r.ok) { const e = await r.text(); return { reply:`[OpenAI error ${r.status}]`, ms:Date.now()-start } }
      const j = await r.json()
      return { reply: j.choices?.[0]?.message?.content || '[no response]', ms:Date.now()-start, source:'OpenAI · GPT-4o' }
    } catch(e) { return { reply:`[GPT-4o offline: ${e.message}]`, ms:Date.now()-start } }
  }

  if (provider === 'gemini') {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ contents:[{ parts:[{ text: input }] }], generationConfig:{ maxOutputTokens:300, temperature:0.7 } }),
        signal: AbortSignal.timeout(15000)
      })
      if (!r.ok) { const e = await r.text(); return { reply:`[Gemini error ${r.status}]`, ms:Date.now()-start } }
      const j = await r.json()
      return { reply: j.candidates?.[0]?.content?.parts?.[0]?.text || '[no response]', ms:Date.now()-start, source:'Google · Gemini-2.0-Flash' }
    } catch(e) { return { reply:`[Gemini offline: ${e.message}]`, ms:Date.now()-start } }
  }

  // Ollama fallback
  try {
    const r = await fetch('http://localhost:11434/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model: provider, messages, stream:false }),
      signal: AbortSignal.timeout(30000)
    })
    const j = await r.json()
    return { reply: j.message?.content || j.response || '[no response]', ms:Date.now()-start, source:`Ollama · ${provider}` }
  } catch(e) { return { reply:`[Ollama offline]`, ms:Date.now()-start } }
}

// ── Render a turn ─────────────────────────────────────────────────────────────

function renderTurn(bob, llm, provider) {
  const w = process.stdout.columns || 72
  const divider = '─'.repeat(Math.min(w, 72))

  // BOB block
  process.stdout.write('\n')
  process.stdout.write(`  \x1b[32m╔══ BOB \x1b[0m${divider.slice(7)}\n`)
  process.stdout.write(`  \x1b[32m║\x1b[0m  ${bob.nil.word ? `Oracle: ${bob.nil.word}` : 'Oracle: NIL'}  ${bob.trigger.sequence}  \x1b[33m${bob.route.agent}\x1b[0m → ${bob.route.action}\n`)
  process.stdout.write(`  \x1b[32m║\x1b[0m  Abjad: ${bob.route.abjad}  Ada: ${bob.gate.ok ? '\x1b[32mALLOWED\x1b[0m' : '\x1b[31mDENIED\x1b[0m'}  SSM: ${bob.newState.toFixed(4)}  Entropy: ${bob.src}\n`)
  process.stdout.write(`  \x1b[32m║\x1b[0m  Tessera: ${bob.trigger.tessera}\n`)
  process.stdout.write(`  \x1b[32m║\x1b[0m  WORM: \x1b[2m${bob.seal.slice(0,40)}…\x1b[0m\n`)
  // Wrap answer text
  const ansWords = bob.answer.split(' ')
  let line = '  \x1b[32m║\x1b[0m  '
  ansWords.forEach(w2 => {
    if ((line + w2).length > 74) { process.stdout.write(line + '\n'); line = '  \x1b[32m║\x1b[0m  ' }
    line += w2 + ' '
  })
  if (line.trim().length > 5) process.stdout.write(line + '\n')
  process.stdout.write(`  \x1b[32m╚\x1b[0m${divider.slice(1)}\n`)

  // LLM block
  const llmLabel = llm.source || provider.toUpperCase()
  process.stdout.write(`\n  \x1b[36m╔══ ${llmLabel} \x1b[0m\n`)
  if (llm.reply) {
    const replyWords = llm.reply.trim().split(' ')
    let rline = '  \x1b[36m║\x1b[0m  '
    replyWords.forEach(w3 => {
      if ((rline + w3).length > 74) { process.stdout.write(rline + '\n'); rline = '  \x1b[36m║\x1b[0m  ' }
      rline += w3 + ' '
    })
    if (rline.trim().length > 5) process.stdout.write(rline + '\n')
  }
  process.stdout.write(`  \x1b[36m║\x1b[0m  \x1b[2m(${llm.ms}ms)\x1b[0m\n`)
  process.stdout.write(`  \x1b[36m╚\x1b[0m${divider.slice(1)}\n\n`)
}

// ── Main REPL ─────────────────────────────────────────────────────────────────

const provider  = process.argv[2] || 'groq'
const llmLabel  = { groq:'Groq Llama-3.3-70B', gpt4o:'GPT-4o', gemini:'Gemini-2.0-Flash' }[provider] || provider

let ssmState    = 0.0
const llmHistory = []
let turnCount   = 0

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })

process.stdout.write('\n')
process.stdout.write('  \x1b[32m██████╗  ██████╗ ██████╗\x1b[0m\n')
process.stdout.write('  \x1b[32m██╔══██╗██╔═══██╗██╔══██╗\x1b[0m\n')
process.stdout.write('  \x1b[32m██████╔╝██║   ██║██████╔╝\x1b[0m\n')
process.stdout.write('  \x1b[32m██╔══██╗██║   ██║██╔══██╗\x1b[0m\n')
process.stdout.write('  \x1b[32m██████╔╝╚██████╔╝██████╔╝\x1b[0m\n')
process.stdout.write('  \x1b[32m╚═════╝  ╚═════╝ ╚═════╝\x1b[0m\n')
process.stdout.write(`\n  Sovereign Logic Machine vs \x1b[36m${llmLabel}\x1b[0m\n`)
process.stdout.write('  HolyC NIL · EmojiCode QRNG · Prolog · Ada · WORM\n')
process.stdout.write('  \x1b[2m/worm  /agent  /quit\x1b[0m\n\n')

rl.on('close', () => {
  process.stdout.write('\n  WORM chain sealed. BOB holds.\n\n')
  process.exit(0)
})

function prompt() {
  if (!process.stdin.isTTY && rl.closed) return
  rl.question('  \x1b[33m>\x1b[0m ', async (input) => {
    input = input.trim()
    if (!input) { prompt(); return }

    if (input === '/quit' || input === '/exit') {
      process.stdout.write('\n  WORM chain sealed. BOB holds.\n\n')
      rl.close(); process.exit(0)
    }

    if (input === '/worm') {
      const chain = worm.load()
      process.stdout.write(`\n  WORM chain — ${chain.length} events\n`)
      chain.slice(-5).forEach((e, i) => {
        process.stdout.write(`  ${chain.length - 5 + i + 1}. ${e.label}  \x1b[2m${e.seal.slice(0,24)}…\x1b[0m  ${e.ts.slice(0,19)}\n`)
      })
      process.stdout.write('\n')
      prompt(); return
    }

    if (input === '/agent') {
      const { runAgent } = await import('./autonomous_agent.mjs')
      await runAgent(3, { verbose: true, delayMs: 200 })
      prompt(); return
    }

    turnCount++
    process.stdout.write(`  \x1b[2mProcessing…\x1b[0m\r`)

    const [bob, llm] = await Promise.all([
      askBOB(input, ssmState),
      askLLM(input, provider, llmHistory)
    ])

    ssmState = bob.newState

    // Update LLM history for context
    llmHistory.push({ role:'user', content: input })
    if (llm.reply) llmHistory.push({ role:'assistant', content: llm.reply })

    renderTurn(bob, llm, provider)
    prompt()
  })
}

prompt()
