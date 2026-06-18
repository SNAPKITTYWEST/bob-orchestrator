# BOB HolyC Execution Gate

HolyC is Terry Davis's language from TempleOS. BOB runs it through a sovereign gate.

## CRITICAL: Simulation vs Real

```
HolyC is NOT executed on host hardware.
Phase 0 uses HOLYC_SIM — a node-safe AST evaluator.
Real HolyC experiments require QEMU_SANDBOX (not yet implemented).
No host machine code ever runs in HOLYC_SIM mode.
```

## Execution modes

| Mode | What runs | How to activate |
|------|-----------|-----------------|
| `HOLYC_SIM` | Node.js AST evaluator. Safe. Default. | (automatic) |
| `QEMU_SANDBOX` | Real HolyC in isolated QEMU VM. | `BOB_HOLYC_MODE=QEMU_SANDBOX` |
| `DISABLED` | All HolyC blocked. | `BOB_HOLYC_MODE=DISABLED` |

## Gate pipeline

```
request
→ Prolog selects agent class
→ Lean proof obligation checked
→ Ada: Can_Invoke_HolyC (class + mode)
→ Ada: Can_Write_WORM (class + trust)
→ HolyC parsed + simulated
→ WORM event sealed (SHA-256)
→ optional Ollama call (Ada gated)
→ final sealed output
```

## Ada contracts

All gates are specified in `ada/bob_contract.ads` and enforced in `ada/bob_contract.adb`.
The JS bridge `ada/ada_gate.mjs` implements identical semantics at runtime.

| Contract | Rule |
|----------|------|
| `Can_Invoke_HolyC` | SENTINEL/BUILDER in HOLYC_SIM; SENTINEL only in QEMU |
| `Can_Write_WORM` | Trust ≥ MEDIUM, not ORACLE |
| `Can_Call_Ollama` | Trust ≥ MEDIUM |
| `Can_Invoke_Agent` | Trust ≥ HIGH; SENTINEL/BUILDER/ARCHIVIST only |
| `Can_Run_QEMU` | SENTINEL only, QEMU_SANDBOX mode |
| `Can_Mutate_State` | Trust ≥ HIGH; SENTINEL/BUILDER only |

## Commands

```bash
# Run full HolyC gate test suite
node core/bob.mjs --holy-test

# Run a specific .HC file through the gate
node core/bob.mjs --holy-run holyc/holy_examples/boot.HC
node core/bob.mjs --holy-run holyc/holy_examples/agent_status.HC
node core/bob.mjs --holy-run holyc/holy_examples/worm_seal.HC

# Show Ada gate report for all agent classes
node core/bob.mjs --gate-report
```

## Supported HolyC simulation commands

| Command | Effect |
|---------|--------|
| `Print("text");` | Emit to output buffer |
| `AgentStatus();` | Print current agent info |
| `WormSeal("payload");` | Seal payload into WORM chain, return hash |
| `TrustCheck("capability");` | Ada capability check, returns 1/0 |
| `GetModel();` | Return current Ollama model |
| `GetTrust();` | Return numeric trust level (0-4) |
| `GetClass();` | Return agent class string |
| `Assert(expr, "msg");` | Halt if expr is falsy |

## Absolute deny list

These commands are BLOCKED in all modes — they access host hardware:

`Sys`, `Spawn`, `FOpen`, `FClose`, `FWrite`, `FRead`, `Dir`, `GetPid`, `Exit`, `__cmd__`
