/**
 * Ada Gate — JS bridge implementing bob_contract.ads/adb semantics
 * This is the runtime enforcement of the Ada contract spec.
 * Every rule here mirrors the Ada body exactly — one-to-one.
 * If the Ada spec changes, this file must change too.
 */

// ── Trust ordering ───────────────────────────────────────────────────────────

const TRUST_RANK = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, SOVEREIGN: 4 }

function trustAtLeast (agentTrust, required) {
  return (TRUST_RANK[agentTrust] ?? 0) >= (TRUST_RANK[required] ?? 99)
}

// ── Outcome constructors ─────────────────────────────────────────────────────

const allow = (reason) => ({ result: 'ALLOWED', reason })
const deny  = (reason) => ({ result: 'DENIED',  reason })

// ── Gate 1: Can_Invoke_HolyC ─────────────────────────────────────────────────

export function Can_Invoke_HolyC (agentClass, mode) {
  if (mode === 'DISABLED') {
    return deny('HolyC DISABLED: BOB_HOLYC_MODE=DISABLED or no sandbox present')
  }
  if (mode === 'QEMU_SANDBOX') {
    if (agentClass === 'SENTINEL') return allow('SENTINEL may invoke HolyC in QEMU_SANDBOX')
    return deny(`QEMU_SANDBOX requires SENTINEL class; ${agentClass} is not authorized`)
  }
  // HOLYC_SIM
  switch (agentClass) {
    case 'SENTINEL':  return allow('SENTINEL may invoke HolyC in HOLYC_SIM')
    case 'BUILDER':   return allow('BUILDER may invoke HolyC in HOLYC_SIM')
    case 'ORACLE':    return deny('ORACLE is read-only: HolyC execution denied')
    case 'ARCHIVIST': return deny('ARCHIVIST does not execute code: use BUILDER')
    case 'BERSERKER': return deny('BERSERKER red-team mode: HolyC denied in sim (use QEMU)')
    default:          return deny(`Unknown agent class: ${agentClass}`)
  }
}

// ── Gate 2: Can_Write_WORM ───────────────────────────────────────────────────

export function Can_Write_WORM (agentClass, trust) {
  if (!trustAtLeast(trust, 'MEDIUM')) {
    return deny(`Trust ${trust} below MEDIUM: WORM write denied`)
  }
  if (agentClass === 'ORACLE') {
    return deny('ORACLE is constitutionally read-only: WORM write denied')
  }
  return allow(`${agentClass} with trust ${trust} may write WORM`)
}

// ── Gate 3: Can_Call_Ollama ──────────────────────────────────────────────────

export function Can_Call_Ollama (agentClass, trust) {
  if (!trustAtLeast(trust, 'MEDIUM')) {
    return deny(`Trust ${trust} below MEDIUM: Ollama call denied`)
  }
  return allow(`${agentClass} with trust ${trust} may call Ollama`)
}

// ── Gate 4: Can_Invoke_Agent ─────────────────────────────────────────────────

export function Can_Invoke_Agent (agentClass, trust) {
  if (!trustAtLeast(trust, 'HIGH')) {
    return deny(`Trust ${trust} below HIGH: agent delegation denied`)
  }
  switch (agentClass) {
    case 'SENTINEL':  return allow('SENTINEL may delegate to agents')
    case 'BUILDER':   return allow('BUILDER may delegate to agents')
    case 'ARCHIVIST': return allow('ARCHIVIST may delegate read tasks')
    case 'ORACLE':    return deny('ORACLE cannot delegate: read-only')
    case 'BERSERKER': return deny('BERSERKER cannot delegate: adversarial class isolation')
    default:          return deny(`Unknown agent class: ${agentClass}`)
  }
}

// ── Gate 5: Can_Run_QEMU ─────────────────────────────────────────────────────

export function Can_Run_QEMU (agentClass, mode) {
  if (mode !== 'QEMU_SANDBOX') {
    return deny(`Can_Run_QEMU requires QEMU_SANDBOX mode (current: ${mode})`)
  }
  if (agentClass !== 'SENTINEL') {
    return deny(`Only SENTINEL may control the QEMU VM boundary; ${agentClass} is not authorized`)
  }
  return allow('SENTINEL in QEMU_SANDBOX mode: VM boundary authorized')
}

// ── Gate 6: Can_Mutate_State ─────────────────────────────────────────────────

export function Can_Mutate_State (agentClass, trust) {
  if (!trustAtLeast(trust, 'HIGH')) {
    return deny(`Trust ${trust} below HIGH: state mutation denied`)
  }
  switch (agentClass) {
    case 'SENTINEL':  return allow('SENTINEL may mutate SSM state')
    case 'BUILDER':   return allow('BUILDER may mutate SSM state (artifact creation)')
    case 'ORACLE':    return deny('ORACLE is constitutionally read-only: mutation denied')
    case 'ARCHIVIST': return deny('ARCHIVIST indexes but does not mutate state')
    case 'BERSERKER': return deny('BERSERKER may not mutate state: isolation required')
    default:          return deny(`Unknown agent class: ${agentClass}`)
  }
}

// ── Convenience: check any named capability ───────────────────────────────────

export function checkCapability (agentClass, cap) {
  const ADA_CLASS_CAPS = {
    SENTINEL:  ['write', 'read', 'block', 'seal', 'invoke', 'mutate'],
    ORACLE:    ['read', 'analyze', 'pattern_match'],
    BUILDER:   ['write', 'read', 'generate', 'seal', 'invoke'],
    ARCHIVIST: ['read', 'index', 'provenance'],
    BERSERKER: ['inject', 'red_team', 'read']
  }
  return (ADA_CLASS_CAPS[agentClass] || []).includes(cap)
}

// ── Full gate report for an agent ────────────────────────────────────────────

export function gateReport (agentClass, trust, mode) {
  return {
    agent_class: agentClass,
    trust,
    holyc_mode: mode,
    gates: {
      Can_Invoke_HolyC:  Can_Invoke_HolyC(agentClass, mode),
      Can_Write_WORM:    Can_Write_WORM(agentClass, trust),
      Can_Call_Ollama:   Can_Call_Ollama(agentClass, trust),
      Can_Invoke_Agent:  Can_Invoke_Agent(agentClass, trust),
      Can_Run_QEMU:      Can_Run_QEMU(agentClass, mode),
      Can_Mutate_State:  Can_Mutate_State(agentClass, trust)
    }
  }
}
