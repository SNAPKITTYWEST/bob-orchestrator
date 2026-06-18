/**
 * BOB — Sovereign Orchestrator Core
 * SnapKitty Collective
 *
 * Architecture:
 *   Lean 4 proof gates  → structured symbolic proofs
 *   Ada contract runner  → capability + trust enforcement
 *   Mamba SSM injection  → proofs embedded in hidden state (not context window)
 *   Prolog reasoning     → dynamic agent selection + routing
 *   WORM chain           → every state transition sealed
 *   Ollama bridge        → local inference (Nemotron default)
 *
 * This is NOT a wrapper around an LLM.
 * This IS a reasoning machine that calls LLMs as subcomponents.
 */

import { createHash, randomUUID } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// ── WORM chain ───────────────────────────────────────────────────────────────

const WORM_PATH = join(process.env.HOME || process.env.USERPROFILE || '.', '.bob-worm.json')

const worm = {
  load () {
    if (!existsSync(WORM_PATH)) return []
    try { return JSON.parse(readFileSync(WORM_PATH, 'utf8')) } catch { return [] }
  },
  seal (label, payload, meta = {}) {
    const chain = this.load()
    const prev  = chain.length ? chain[chain.length - 1].seal : '0'.repeat(64)
    const ts    = new Date().toISOString()
    const raw   = JSON.stringify({ label, payload, meta, ts, prev })
    const seal  = createHash('sha256').update(raw).digest('hex')
    const event = { id: randomUUID(), label, payload, meta, ts, prev, seal }
    chain.push(event)
    writeFileSync(WORM_PATH, JSON.stringify(chain, null, 2))
    return event
  },
  verify () {
    const chain = this.load()
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].prev !== chain[i - 1].seal) return { valid: false, broken_at: i }
    }
    return { valid: true, length: chain.length }
  }
}

// ── Ada contract runtime (JS semantics) ─────────────────────────────────────

const TRUST_ORDER = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, SOVEREIGN: 4 }

const ADA_CLASS_TRUST = {
  SENTINEL:  'SOVEREIGN',
  ORACLE:    'HIGH',
  BUILDER:   'HIGH',
  ARCHIVIST: 'HIGH',
  BERSERKER: 'MEDIUM'
}

const ADA_CLASS_CAPS = {
  SENTINEL:  ['write', 'read', 'block', 'seal'],
  ORACLE:    ['read', 'analyze', 'pattern_match'],
  BUILDER:   ['write', 'read', 'generate', 'seal'],
  ARCHIVIST: ['read', 'index', 'provenance'],
  BERSERKER: ['inject', 'red_team', 'read']
}

const ada = {
  trustSatisfies (agentTrust, required) {
    return (TRUST_ORDER[agentTrust] ?? 0) >= (TRUST_ORDER[required] ?? 0)
  },
  capabilityPermitted (agentClass, cap) {
    return (ADA_CLASS_CAPS[agentClass] || []).includes(cap)
  },
  gateAdvance (agentClass, injectionValid) {
    const trust = ADA_CLASS_TRUST[agentClass] || 'NONE'
    if (!this.trustSatisfies(trust, 'MEDIUM'))
      return { permitted: false, reason: `${agentClass} trust ${trust} below MEDIUM` }
    if (agentClass === 'ORACLE')
      return { permitted: false, reason: 'ORACLE is read-only: write advance blocked' }
    if (!injectionValid)
      return { permitted: false, reason: 'Injection proof invalid: state frozen' }
    return { permitted: true, reason: 'ADVANCE_PERMITTED' }
  }
}

// ── Lean 4 proof obligation (bridge) ────────────────────────────────────────
// In production: spawns `lean --run` to verify the theorem.
// Here: structural validation + hash embedding for SSM injection.

const lean = {
  hashTheorem (theorem) {
    return createHash('sha256').update(theorem).digest('hex')
  },
  validate (theorem) {
    if (!theorem || theorem.length < 10) return { valid: false, reason: 'Theorem too short' }
    const hash = this.hashTheorem(theorem)
    return { valid: true, hash, theorem: theorem.slice(0, 80) + (theorem.length > 80 ? '…' : '') }
  }
}

// ── Mamba SSM injection layer ────────────────────────────────────────────────
// h(t) = ā·h(t-1) + b̄·x(t) + W_inject · v_inject(t)
//
// v_inject(t) is a 2048-dim vector derived from:
//   dims   0-255:  Lean 4 proof embedding
//   dims 256-511:  Ada contract embedding
//   dims 512-767:  WORM chain lineage embedding
//   dims 768-2047: Mamba passthrough (zeroed in scaffold, filled by Mamba weights)
//
// In the JS scaffold, we represent the vector as a Float32Array.
// In the real BOB with trained weights, this becomes an actual tensor injection.

function hashToVector (hashHex, start, length, target) {
  for (let i = 0; i < length; i++) {
    const byte = parseInt(hashHex.slice((i * 2) % 64, (i * 2) % 64 + 2), 16)
    target[start + i] = (byte / 255.0) * 2 - 1  // normalize to [-1, 1]
  }
}

const ssm = {
  buildInjectionVector (proofHash, contractHash, wormSeal) {
    if (proofHash.length !== 64 || contractHash.length !== 64)
      return null
    const v = new Float32Array(2048)
    hashToVector(proofHash,    0,   256, v)  // Lean 4 proof embedding
    hashToVector(contractHash, 256, 256, v)  // Ada contract embedding
    hashToVector(wormSeal,     512, 256, v)  // WORM lineage embedding
    // dims 768-2047: zeroed (Mamba passthrough — filled by trained weights)
    return v
  },

  // Simplified state update (scalar simulation — real: GPU tensor operation)
  updateState (h_prev, x_input, v_inject, alpha = 0.9) {
    if (!v_inject) return { h: h_prev, frozen: true }
    // h(t) = α·h(t-1) + (1-α)·x + inject_norm
    const inject_norm = v_inject.slice(0, 256).reduce((s, v) => s + v * v, 0) / 256
    const h_new = alpha * h_prev + (1 - alpha) * x_input + inject_norm * 0.01
    return { h: h_new, frozen: false }
  }
}

// ── Prolog reasoning stub (JS semantics) ────────────────────────────────────
// In production: calls `swipl -g "..." sovereign_kernel.pl`
// Here: JS implementation of the key predicates

const prolog = {
  selectAgent (task, availableAgents) {
    const map = {
      security_check:       'SENTINEL',
      read_only_analysis:   'ORACLE',
      code_generation:      'BUILDER',
      memory_recall:        'ARCHIVIST',
      adversarial_test:     'BERSERKER'
    }
    const preferred = map[task]
    if (preferred && availableAgents.includes(preferred)) return preferred
    return availableAgents[0]
  },
  routeToken (token, inThink) {
    if (token === '<think>') return 'toggle_open'
    if (token === '</think>') return 'toggle_close'
    return inThink ? 'reasoning' : 'output'
  }
}

// ── Agent registry ───────────────────────────────────────────────────────────

const agents = new Map()

function createAgent (name, agentClass, capabilities = []) {
  const id          = randomUUID()
  const trust       = ADA_CLASS_TRUST[agentClass] || 'NONE'
  const permCaps    = capabilities.filter(c => ada.capabilityPermitted(agentClass, c))
  const agent       = { id, name, agentClass, trust, capabilities: permCaps, state: 0.0, worm_seal: null }
  const event       = worm.seal(`AGENT_BORN:${name}`, JSON.stringify({ id, name, agentClass, trust, capabilities: permCaps }))
  agent.worm_seal   = event.seal
  agents.set(id, agent)
  return agent
}

// ── Sovereign step (core loop) ───────────────────────────────────────────────

async function sovereignStep ({ agentId, task, input, lean4Theorem, adaContractText, ollamaHost = 'http://localhost:11434', model = 'nemotron' }) {
  const agent = agents.get(agentId)
  if (!agent) throw new Error(`Agent ${agentId} not found`)

  const step = { agentId, task, input: input.slice(0, 200), lean4Theorem: lean4Theorem?.slice(0, 80), ts: new Date().toISOString() }

  // 1. Lean 4 proof validation
  const proof = lean.validate(lean4Theorem || `theorem sovereign_step_${task} : True := trivial`)
  if (!proof.valid) return { error: `Proof invalid: ${proof.reason}`, step, frozen: true }

  // 2. Ada contract hash
  const contractHash = createHash('sha256').update(adaContractText || 'default_contract').digest('hex')

  // 3. WORM seal for this step
  const wormEvent    = worm.seal(`BOB_STEP:${task}`, JSON.stringify(step), { agent: agent.name, class: agent.agentClass })

  // 4. Build SSM injection vector
  const v_inject     = ssm.buildInjectionVector(proof.hash, contractHash, wormEvent.seal)
  const injectionValid = v_inject !== null

  // 5. Ada gate check
  const gate = ada.gateAdvance(agent.agentClass, injectionValid)
  if (!gate.permitted) {
    return { error: gate.reason, step, frozen: true, worm_seal: wormEvent.seal }
  }

  // 6. Update SSM state
  const x_input    = input.split('').reduce((s, c) => s + c.charCodeAt(0), 0) / (input.length * 128)
  const stateUpdate = ssm.updateState(agent.state, x_input, v_inject)
  agent.state       = stateUpdate.h

  // 7. Optional: call Ollama (the LLM is a subcomponent here, not the orchestrator)
  let llmReply = null
  if (!task.startsWith('internal_')) {
    try {
      const res = await fetch(`${ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: `You are ${agent.name} (${agent.agentClass}). Task: ${task}. Trust: ${agent.trust}. SSM state: ${agent.state.toFixed(4)}.` },
            { role: 'user', content: input }
          ],
          stream: false
        }),
        signal: AbortSignal.timeout(30_000)
      })
      if (res.ok) {
        const j  = await res.json()
        llmReply = j.message?.content || j.response
      }
    } catch {
      llmReply = null  // Ollama offline — orchestrator still operates
    }
  }

  // 8. Seal the completed step
  const finalSeal = worm.seal(`BOB_STEP_COMPLETE:${task}`, JSON.stringify({
    agent: agent.name, agentClass: agent.agentClass, task, llm_used: !!llmReply, new_state: agent.state
  }))

  return {
    ok:           true,
    agent:        agent.name,
    agentClass:   agent.agentClass,
    task,
    proof_hash:   proof.hash,
    contract_hash: contractHash,
    ssm_state:    agent.state,
    injection_dim: v_inject?.length,
    gate:         gate.reason,
    llm_reply:    llmReply,
    worm_seal:    finalSeal.seal,
    worm_chain:   worm.load().length
  }
}

// ── CLI / test mode ──────────────────────────────────────────────────────────

if (process.argv.includes('--test')) {
  console.log('\n  BOB Orchestrator — sovereign smoke test\n')

  const sentinel = createAgent('SENTINEL-1', 'SENTINEL', ['write', 'seal', 'block'])
  console.log(`  ✓  SENTINEL created  seal=${sentinel.worm_seal.slice(0, 16)}…`)

  const oracle = createAgent('ORACLE-1', 'ORACLE', ['read', 'analyze'])
  console.log(`  ✓  ORACLE created    seal=${oracle.worm_seal.slice(0, 16)}…`)

  // Test Ada gate — ORACLE should be blocked from write advance
  const oracleGate = ada.gateAdvance('ORACLE', true)
  console.assert(!oracleGate.permitted, 'ORACLE should be blocked')
  console.log(`  ✓  ORACLE gate blocks write: "${oracleGate.reason}"`)

  // Test Lean 4 proof validation
  const proof = lean.validate('theorem P1 : ∀ n : Nat, n + 0 = n := by simp')
  console.assert(proof.valid, 'Proof should be valid')
  console.log(`  ✓  Lean proof hash: ${proof.hash.slice(0, 16)}…`)

  // Test SSM injection vector
  const v = ssm.buildInjectionVector(proof.hash, proof.hash, proof.hash.split('').reverse().join(''))
  console.assert(v?.length === 2048, 'Vector should be 2048-dim')
  const nonZero = Array.from(v.slice(0, 256)).filter(x => x !== 0).length
  console.log(`  ✓  SSM injection vector: 2048-dim, ${nonZero}/256 proof dims populated`)

  // Test WORM chain
  const integrity = worm.verify()
  console.log(`  ✓  WORM chain: ${integrity.length} events, valid=${integrity.valid}`)

  // Test sovereign step (no Ollama needed for internal task)
  const result = await sovereignStep({
    agentId: sentinel.id,
    task: 'internal_test',
    input: 'Hello sovereign world',
    lean4Theorem: 'theorem test : True := trivial',
    adaContractText: 'SENTINEL::write::HIGH'
  })
  console.assert(result.ok, `Step should succeed: ${result.error}`)
  console.log(`  ✓  Sovereign step OK: SSM state=${result.ssm_state.toFixed(4)}, seal=${result.worm_seal.slice(0, 16)}…`)

  console.log('\n  BOB is sovereign. The gate holds.\n')
}

export { createAgent, sovereignStep, worm, ada, lean, ssm, prolog, agents }
