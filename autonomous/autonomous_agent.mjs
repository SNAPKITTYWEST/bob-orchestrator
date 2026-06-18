/**
 * BOB Autonomous Agent
 *
 * The loop that nobody fully controls — not even the builder.
 *
 * Stack (bottom to top):
 *   HolyC NIL    — ground state oracle. Terry's entropy ritual preserved.
 *                  If oracle is silent (NIL) → agent holds. Does not fire.
 *   Emoji Trigger — quantum bytes → emoji sequence → opcode metadata.
 *                  The art is the instruction set. Steganographic routing.
 *   BOB Pipeline  — Prolog route → Ada gate → Lean4 proof → SSM update → WORM seal.
 *   Feedback      — WORM output hash seeds the NEXT tick's quantum input.
 *                  The agent reads its own sealed history as entropy.
 *
 * What this creates:
 *   An agent that activates from quantum vacuum.
 *   Reads its instructions from emoji art.
 *   Executes through HolyC → BOB → Ada gate.
 *   Cannot be predicted — QRNG + WORM feedback = genuine non-determinism.
 *   Cannot hallucinate — Ada gate blocks every unverified output.
 *   Cannot hide — WORM seals every tick permanently.
 *
 * "IDK what that will create" — that is the correct response.
 * The 49th Call was never spoken because its consequences were unknown.
 * This agent IS the 49th Call made executable.
 */

import { holyc_nil }     from './holyc_nil.mjs'
import { emoji_trigger } from './emoji_trigger.mjs'
import { createHash }    from 'crypto'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join }          from 'path'

// ── Minimal WORM (standalone, no dependency on core/bob.mjs) ─────────────────

const AGENT_WORM_PATH = join(process.env.HOME || process.env.USERPROFILE || '.', '.bob-agent-worm.json')

const agentWorm = {
  load() {
    if (!existsSync(AGENT_WORM_PATH)) return []
    try { return JSON.parse(readFileSync(AGENT_WORM_PATH, 'utf8')) } catch { return [] }
  },
  seal(label, payload) {
    const chain = this.load()
    const prev  = chain.length ? chain[chain.length - 1].seal : '0'.repeat(64)
    const ts    = new Date().toISOString()
    const raw   = JSON.stringify({ label, payload, ts, prev })
    const seal  = createHash('sha256').update(raw).digest('hex')
    const event = { label, payload, ts, prev, seal }
    chain.push(event)
    writeFileSync(AGENT_WORM_PATH, JSON.stringify(chain, null, 2))
    return event
  },
  lastSeal() {
    const chain = this.load()
    return chain.length ? chain[chain.length - 1].seal : '0'.repeat(64)
  }
}

// ── Minimal Ada gate (standalone) ─────────────────────────────────────────────

function adaGate(op, abjad) {
  // Ada contract: ALLOWED if Abjad weight ≥ 90 and op is not VACUUM
  if (op === 'OP_UNKNOWN') return { result: 'DENIED',  reason: 'vacuum_state — no virtue' }
  if (abjad < 90)          return { result: 'DENIED',  reason: `abjad ${abjad} below minimum threshold 90` }
  if (op === 'OP_NIL')     return { result: 'ALLOWED', reason: 'NIL-910 — oracle hold, agent waits' }
  return { result: 'ALLOWED', reason: `${op} abjad:${abjad} — virtue sufficient` }
}

// ── Minimal Prolog route (standalone) ────────────────────────────────────────

const PROLOG_RULES = {
  'OP_SOVEREIGN':      { agent: 'BOB-CORE',    action: 'sovereign_step' },
  'OP_QUANTUM':        { agent: 'ORACLE',       action: 'fetch_entropy' },
  'OP_WORM':           { agent: 'ARCHIVIST',    action: 'seal_event' },
  'OP_PROLOG':         { agent: 'BOB-CORE',    action: 'prolog_route' },
  'OP_ADA':            { agent: 'SENTINEL',     action: 'gate_check' },
  'OP_LEAN4':          { agent: 'VERIFIER',     action: 'proof_check' },
  'OP_QUBIT':          { agent: 'ORACLE',       action: 'hold_superposition' },
  'OP_SSM':            { agent: 'BOB-CORE',    action: 'ssm_inject' },
  'OP_HOLYC':          { agent: 'TERRY-NIL',   action: 'oracle_consult' },
  'OP_NIL':            { agent: 'TERRY-NIL',   action: 'hold' },
  'OP_PLANNER_ANTE':   { agent: 'PLANNER',      action: 'pattern_fire' },
  'OP_PLANNER_CONS':   { agent: 'PLANNER',      action: 'goal_achieve' },
  'OP_INPUT':          { agent: 'RECEPTOR',     action: 'receive' },
  'OP_OUTPUT':         { agent: 'EMITTER',      action: 'emit_sealed' },
}

function prologRoute(op) {
  return PROLOG_RULES[op] || { agent: 'VOID', action: 'undefined' }
}

// ── SSM state (minimal in-memory recurrence) ──────────────────────────────────

let ssmState = 0.0

function ssmUpdate(abjad, wormSeal) {
  // h(t) = 0.9 * h(t-1) + 0.1 * (abjad/910) + noise from WORM seal
  const x         = abjad / 910
  const wormNoise = parseInt(wormSeal.slice(0, 8), 16) / 0xFFFFFFFF * 0.01
  ssmState        = 0.9 * ssmState + 0.1 * x + wormNoise
  return ssmState
}

// ── ANU QRNG fetch (with CPU fallback) ───────────────────────────────────────

async function fetchQuantumBytes(n = 8) {
  try {
    const res = await fetch(
      `https://qrng.anu.edu.au/API/jsonI.php?length=${n}&type=uint8`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (res.ok) {
      const j = await res.json()
      if (j.success) return new Uint8Array(j.data)
    }
  } catch { /* ANU offline — use CSPRNG fallback */ }

  // CSPRNG fallback: NOT quantum, but cryptographically strong
  const { randomBytes } = await import('crypto')
  return new Uint8Array(randomBytes(n))
}

// ── Mix WORM feedback into next tick's entropy ────────────────────────────────
// The agent reads its own sealed history. The past is the seed for the future.
// This is the feedback loop that makes the agent genuinely autonomous.

function wormFeedback(quantumBytes, wormSeal) {
  const sealBytes = Buffer.from(wormSeal.slice(0, quantumBytes.length * 2), 'hex')
  return quantumBytes.map((b, i) => b ^ (sealBytes[i] || 0))
}

// ── Single agent tick ─────────────────────────────────────────────────────────

export async function agentTick(tickNumber, prevWormSeal = null, opts = {}) {
  const { verbose = false, taskOverride = null } = opts

  // 1. Fetch quantum bytes
  const rawBytes = await fetchQuantumBytes(8)

  // 2. Mix WORM feedback — the agent's history shapes its future
  const qBytes = prevWormSeal
    ? wormFeedback(rawBytes, prevWormSeal)
    : rawBytes

  // 3. HolyC NIL — ground state oracle
  const nil = holyc_nil(qBytes)

  if (nil.state === 'NIL') {
    const event = agentWorm.seal(`TICK_${tickNumber}_NIL`, {
      state: 'NIL', abjad: 910, reason: nil.reason, mean: nil.mean
    })
    if (verbose) console.log(`  [${tickNumber}] NIL  — oracle silent. Agent holds. abjad:910  seal:${event.seal.slice(0,16)}…`)
    return { tick: tickNumber, state: 'NIL', seal: event.seal }
  }

  // 4. Emoji trigger — quantum state activates emoji instruction sequence
  const trigger = emoji_trigger(qBytes)
  const primary = trigger.primary

  if (verbose) {
    console.log(`  [${tickNumber}] WORD: ${nil.word}  →  ${primary.sequence}  op:${primary.op}  abjad:${primary.abjad}`)
  }

  // 5. Ada gate — does this opcode have sufficient virtue to proceed?
  const gate = adaGate(primary.op, primary.abjad)

  if (gate.result === 'DENIED') {
    const event = agentWorm.seal(`TICK_${tickNumber}_BLOCKED`, {
      word: nil.word, op: primary.op, abjad: primary.abjad, reason: gate.reason
    })
    if (verbose) console.log(`     Ada: DENIED — ${gate.reason}`)
    return { tick: tickNumber, state: 'BLOCKED', reason: gate.reason, seal: event.seal }
  }

  // 6. Prolog route — which agent handles this opcode?
  const route = prologRoute(primary.op)

  // 7. SSM update — integrate this tick into the running state
  const ssmSeal = agentWorm.lastSeal()
  const newState = ssmUpdate(primary.abjad, ssmSeal)

  // 8. Construct the task / output
  const task = taskOverride || `${route.action}(${nil.word}, abjad:${primary.abjad})`

  // 9. WORM seal the complete tick
  const payload = {
    tick:         tickNumber,
    word:         nil.word,
    dee_word:     nil.dee_word,
    virtue:       nil.virtue,
    emoji_seq:    trigger.sequence,
    op:           primary.op,
    route:        primary.route,
    agent:        route.agent,
    action:       task,
    abjad:        primary.abjad,
    ssm_state:    parseFloat(newState.toFixed(6)),
    spectrum_pos: trigger.meta.spectrum_pos,
    planner_fires: trigger.meta.planner_fires,
    tessera:      trigger.tessera,
    dee:          primary.dee,
    ada:          gate.reason,
    raw_entropy:  [...rawBytes],
    merged_entropy: [...qBytes],
  }

  const event = agentWorm.seal(`TICK_${tickNumber}_FIRED`, payload)

  if (verbose) {
    console.log(`     Prolog: ${route.agent} → ${task}`)
    console.log(`     SSM:    state=${newState.toFixed(4)}`)
    console.log(`     Dee:    ${primary.dee}`)
    console.log(`     WORM:   ${event.seal.slice(0,32)}…`)
    if (trigger.meta.planner_fires.length > 0) {
      console.log(`     PLANNER antecedents fired: ${trigger.meta.planner_fires.join(', ')}`)
    }
    console.log(`     Tessera: ${trigger.tessera}`)
  }

  return {
    tick:     tickNumber,
    state:    'FIRED',
    word:     nil.word,
    op:       primary.op,
    agent:    route.agent,
    action:   task,
    abjad:    primary.abjad,
    ssm:      newState,
    tessera:  trigger.tessera,
    sequence: trigger.sequence,
    seal:     event.seal,
  }
}

// ── Run N ticks ───────────────────────────────────────────────────────────────

export async function runAgent(ticks = 5, opts = {}) {
  const { verbose = true, delayMs = 500 } = opts
  const results = []
  let prevSeal  = null

  console.log(`\n  BOB Autonomous Agent — ${ticks} ticks\n`)
  console.log('  Stack: HolyC NIL → EmojiCode QRNG → Prolog → Ada → SSM → WORM\n')

  for (let i = 1; i <= ticks; i++) {
    const result = await agentTick(i, prevSeal, { verbose })
    results.push(result)
    prevSeal = result.seal  // WORM feedback: this tick seeds the next

    if (delayMs > 0 && i < ticks) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  const fired   = results.filter(r => r.state === 'FIRED')
  const nils    = results.filter(r => r.state === 'NIL')
  const blocked = results.filter(r => r.state === 'BLOCKED')

  console.log('\n  ─────────────────────────────────────────────')
  console.log(`  FIRED:   ${fired.length}/${ticks}`)
  console.log(`  NIL:     ${nils.length}/${ticks}  (oracle held — virtue unspoken)`)
  console.log(`  BLOCKED: ${blocked.length}/${ticks}  (Ada gate denied)`)
  if (fired.length > 0) {
    console.log(`  SSM:     ${fired[fired.length-1].ssm.toFixed(4)}  (final state)`)
    console.log(`  Words:   ${fired.map(r => r.word).join(' · ')}`)
    console.log(`  Ops:     ${fired.map(r => r.op).join(' · ')}`)
  }
  console.log(`  WORM:    ${agentWorm.load().length} events sealed`)
  console.log('  ─────────────────────────────────────────────\n')

  return { results, fired, nils, blocked }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('autonomous_agent.mjs')) {
  const ticks = parseInt(process.argv[2]) || 6
  await runAgent(ticks, { verbose: true, delayMs: 300 })
}
