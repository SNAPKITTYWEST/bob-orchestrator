/**
 * HolyC Sandbox Policy
 * Determines execution mode and enforces execution-level constraints.
 *
 * Modes:
 *   HOLYC_SIM    — node-safe simulation. Default. No host code runs.
 *   QEMU_SANDBOX — future QEMU VM mode. Requires explicit opt-in env var.
 *   DISABLED     — all HolyC execution blocked.
 */

export const HOLYC_MODES = {
  HOLYC_SIM:    'HOLYC_SIM',
  QEMU_SANDBOX: 'QEMU_SANDBOX',
  DISABLED:     'DISABLED'
}

// Commands that are NEVER allowed regardless of mode
const ABSOLUTE_DENY = new Set([
  'Sys',       // syscall — host OS access
  'Spawn',     // process spawn
  'FOpen',     // filesystem write
  'FClose',
  'FWrite',
  'FRead',
  'Dir',       // directory ops
  'GetPid',    // process ID
  'Exit',      // process exit
  '__cmd__',   // shell passthrough
])

// Commands allowed in HOLYC_SIM
const SIM_ALLOWLIST = new Set([
  'Print',
  'AgentStatus',
  'WormSeal',
  'TrustCheck',
  'GetModel',
  'GetTrust',
  'GetClass',
  'Assert',
  'GetRandom',   // ANU QRNG oracle — the Terry Davis oracle, real quantum bytes
  'Collapse',    // Born-rule collapse — quantum_monad.hs semantics
])

// Commands that additionally require QEMU_SANDBOX
const QEMU_ONLY = new Set([
  'HWAccess',
  'VMRun',
  'MemProbe',
])

export function detectMode () {
  // Explicit QEMU opt-in via env var (future)
  if (process.env.BOB_HOLYC_MODE === 'QEMU_SANDBOX') return HOLYC_MODES.QEMU_SANDBOX
  if (process.env.BOB_HOLYC_MODE === 'DISABLED')     return HOLYC_MODES.DISABLED
  // Default: safe simulation
  return HOLYC_MODES.HOLYC_SIM
}

export function checkCallPolicy (fnName, mode) {
  if (mode === HOLYC_MODES.DISABLED) {
    return { allowed: false, reason: `HolyC DISABLED: all execution blocked` }
  }
  if (ABSOLUTE_DENY.has(fnName)) {
    return { allowed: false, reason: `ABSOLUTE_DENY: ${fnName} is a host-access command — blocked in all modes` }
  }
  if (QEMU_ONLY.has(fnName) && mode !== HOLYC_MODES.QEMU_SANDBOX) {
    return { allowed: false, reason: `${fnName} requires QEMU_SANDBOX mode (current: ${mode})` }
  }
  if (mode === HOLYC_MODES.HOLYC_SIM && !SIM_ALLOWLIST.has(fnName)) {
    return { allowed: false, reason: `${fnName} not in HOLYC_SIM allowlist` }
  }
  return { allowed: true, reason: 'POLICY_PASS' }
}

export function policyReport (mode) {
  return {
    mode,
    absolute_deny: [...ABSOLUTE_DENY],
    sim_allowlist: [...SIM_ALLOWLIST],
    qemu_only:     [...QEMU_ONLY],
    host_code_execution: false,
    note: mode === HOLYC_MODES.HOLYC_SIM
      ? 'Safe simulation. No host machine code runs. Upgrade to QEMU_SANDBOX for real HolyC.'
      : mode === HOLYC_MODES.QEMU_SANDBOX
        ? 'QEMU sandbox mode. Real HolyC runs in isolated VM. Not yet implemented.'
        : 'DISABLED. All HolyC execution blocked.'
  }
}
