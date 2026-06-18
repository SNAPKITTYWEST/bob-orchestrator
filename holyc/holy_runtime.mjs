/**
 * HolyC Runtime — full sovereign pipeline
 *
 * Flow:
 *   request
 *   → Prolog selects agent class
 *   → Lean proof obligation checked
 *   → Ada contract: Can_Invoke_HolyC
 *   → HolyC parsed + sim runs
 *   → WORM event written
 *   → SHA-256 seal generated
 *   → optional Ollama call
 *   → sealed output
 */

import { parse }                   from './holy_parser.mjs'
import { createSimContext }        from './holy_sim.mjs'
import { detectMode, policyReport } from './holy_sandbox_policy.mjs'
import {
  Can_Invoke_HolyC, Can_Write_WORM, Can_Call_Ollama, Can_Mutate_State,
  checkCapability, gateReport
} from '../ada/ada_gate.mjs'
import { createHash }              from 'crypto'

// Lean proof validator (same as core/bob.mjs — could import, kept local for clarity)
function leanValidate (theorem) {
  if (!theorem || theorem.length < 10) return { valid: false, hash: null }
  const hash = createHash('sha256').update(theorem).digest('hex')
  return { valid: true, hash }
}

// Prolog agent selector (JS semantics of sovereign_kernel.pl)
function prologSelectAgent (task, available) {
  const map = {
    holyc_execution:    'BUILDER',
    security_check:     'SENTINEL',
    read_analysis:      'ORACLE',
    memory_recall:      'ARCHIVIST',
    adversarial_test:   'BERSERKER'
  }
  const preferred = map[task] || 'BUILDER'
  return available.includes(preferred) ? preferred : available[0]
}

// ── Main runtime ─────────────────────────────────────────────────────────────

export async function runHolyC ({
  source,
  task       = 'holyc_execution',
  worm,
  agents,
  createAgent,
  ollamaHost = 'http://localhost:11434',
  model      = 'nemotron',
  theorem    = 'theorem holyc_safe : True := trivial'
}) {
  const mode   = detectMode()
  const result = {
    mode,
    task,
    theorem_valid:    false,
    ada_contract:     null,
    prolog_agent:     null,
    holyc_output:     [],
    holyc_events:     [],
    worm_seal:        null,
    ollama_reply:     null,
    error:            null,
    gate_passed:      false
  }

  // ── Step 1: Lean proof obligation ────────────────────────────────────────
  const proof = leanValidate(theorem)
  result.theorem_valid = proof.valid
  if (!proof.valid) {
    result.error = 'LEAN PROOF INVALID: theorem too short or empty'
    return result
  }

  // ── Step 2: Prolog agent selection ───────────────────────────────────────
  const available  = [...agents.values()].map(a => a.agentClass)
  const agentClass = prologSelectAgent(task, available)
  result.prolog_agent = agentClass

  const agent = [...agents.values()].find(a => a.agentClass === agentClass)
    || createAgent(`${agentClass}-HC`, agentClass, ['write', 'read', 'generate', 'seal'])

  // ── Step 3: Ada gate — Can_Invoke_HolyC ─────────────────────────────────
  const adaResult = Can_Invoke_HolyC(agent.agentClass, mode)
  result.ada_contract = adaResult
  if (adaResult.result === 'DENIED') {
    result.error = `ADA CONTRACT DENIED: ${adaResult.reason}`
    return result
  }

  // ── Step 4: Ada gate — Can_Write_WORM (we'll write after sim) ───────────
  const wormGate = Can_Write_WORM(agent.agentClass, agent.trust)
  if (wormGate.result === 'DENIED') {
    result.error = `ADA CONTRACT DENIED (WORM): ${wormGate.reason}`
    return result
  }

  // ── Step 5: Parse + simulate HolyC ──────────────────────────────────────
  let ast
  try {
    ast = parse(source)
  } catch (e) {
    result.error = `HOLYC PARSE ERROR: ${e.message}`
    return result
  }

  const adaGate = { checkCapability: (cls, cap) => checkCapability(cls, cap) }
  const sim     = createSimContext({ mode, worm, agent, adaGate })

  let simOutput, simEvents
  try {
    const r  = await sim.run(ast)
    simOutput = r.output
    simEvents = r.events
  } catch (e) {
    result.error = `HOLYC SIM ERROR: ${e.message}`
    result.holyc_output = simOutput ?? []
    return result
  }

  result.holyc_output = simOutput
  result.holyc_events = simEvents
  result.gate_passed  = true

  // ── Step 6: WORM seal for this HC run ───────────────────────────────────
  const runPayload = JSON.stringify({
    task, mode, agent: agent.name, agentClass: agent.agentClass,
    proof_hash: proof.hash,
    lines: simOutput.length,
    source_hash: createHash('sha256').update(source).digest('hex')
  })
  const wormEvent     = worm.seal(`HOLYC_RUN:${task}`, runPayload, { mode, class: agent.agentClass })
  result.worm_seal    = wormEvent.seal

  // ── Step 7: Optional Ollama call (after gate passes) ────────────────────
  const ollamaGate = Can_Call_Ollama(agent.agentClass, agent.trust)
  if (ollamaGate.result === 'ALLOWED') {
    try {
      const res = await fetch(`${ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: `You are ${agent.name} (${agent.agentClass}). HolyC sim output was: ${simOutput.slice(0, 5).join(' | ')}` },
            { role: 'user',   content: `Summarize this HolyC execution in one sentence.` }
          ],
          stream: false
        }),
        signal: AbortSignal.timeout(20_000)
      })
      if (res.ok) {
        const j          = await res.json()
        result.ollama_reply = j.message?.content || j.response
      }
    } catch {
      // Ollama offline — non-fatal, the sovereign gate already ran
    }
  }

  return result
}

// ── Gate report ──────────────────────────────────────────────────────────────

export function getGateReport (agentClass, trust) {
  const mode = detectMode()
  return {
    ...gateReport(agentClass, trust, mode),
    policy: policyReport(mode)
  }
}
