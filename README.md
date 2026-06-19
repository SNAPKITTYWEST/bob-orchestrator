# BOB — Sovereign Orchestrator

Not an LLM wrapper. A reasoning machine.

Built by SnapKitty Collective | [collectivekitty.com](https://collectivekitty.com)

## Architecture

```
Lean 4 theorem  ──┐
                   ├──→  Injection vector (2048-dim)  ──→  SSM state gate
Ada contract    ──┘                                         h(t) = ā·h(t-1) + b̄·x(t) + W·v_inject
                                                                                ↑
WORM seal  ──────────────────────────────────────────────────────────────────── lineage dim

                                           ↓ gate fires only if proof valid + Ada permits
                                     Ollama (Nemotron) ← subcomponent, not the orchestrator
                                           ↓
                                      WORM-sealed output
```

### Three layers

| Layer | Language | Role |
|-------|----------|------|
| Proof gate | Lean 4 | Formal proof obligations — compile-time correctness |
| Contract runtime | Ada | Capability + trust enforcement — execution-time |
| Reasoning | Prolog | Dynamic agent selection + token routing — query-time |

The LLM (Nemotron via Ollama) is a **subcomponent** called after the gate fires. BOB runs without it.

## Mamba injection

Structured symbolic proofs are embedded into SSM hidden state directly — bypassing the context window:

```
dims   0-255:   Lean 4 proof obligation embedding
dims 256-511:   Ada contract compliance embedding
dims 512-767:   WORM chain lineage embedding
dims 768-2047:  Mamba passthrough (filled by trained weights on bbqbaddie)
```

The gate fires IFF:
- Lean 4 proof is valid (SHA-256 embedded in dims 0-255)
- Ada contract permits the capability
- Agent trust ≥ MEDIUM
- Injection vector is 2048-dim with non-null proof/contract hashes

## Agent classes

| Class | Trust | Write | Notes |
|-------|-------|-------|-------|
| SENTINEL | SOVEREIGN | ✓ | Constitutional enforcer. Blocks violations. |
| ORACLE | HIGH | ✗ | Read-only by constitution. |
| BUILDER | HIGH | ✓ | Creates WORM-sealed artifacts. |
| ARCHIVIST | HIGH | ✗ | Long-context indexing + provenance. |
| BERSERKER | MEDIUM | ✗ | Adversarial testing. Red-team injections. |

## Run

```bash
# Smoke test (no Ollama needed)
node core/bob.mjs --test

# Live demo with Ollama
node bridge/demo.mjs

# Tessera spatial language demo
node tessera/tessera_demo.mjs

# Tessera Studio art + crypto workbench
npm run studio

# Apple GitDOS by SnapKitty OS
npm run gitdos
```

## Tessera Studio

Open `tessera/studio.html` through a local static server to edit spatial programs as art. The studio parses ASCII layout into nodes and edges, renders SVG, compiles BOB opcodes, computes the spatial SHA-256 seal, runs the one-character corruption demo, and exports `.tes`, `.svg`, and manifest JSON artifacts.

The Esolang Crypto-Art Forge adds Brainfuck, Malbolge-inspired, Shakespeare, Chef, LOLCODE/Cat Code, Befunge, and Whitespace generators. Each source can be encrypted with Caesar, Vigenere, XOR-hex, reverse, Unicode codepoints, reverse Unicode, MAGMA seals, macro strings, or emoji code, then fused into a glowing hash seal SVG. The generated esolang can also be wrapped back into a Tessera program so the art, source, cipher, and seal all become one executable artifact.

## Apple GitDOS

`apple-gitdos/` is a retro DOS-inspired AI terminal for the SnapKitty OS / A.P.E. computer demo. The terminal is the chat UI: type `HELP`, `CATALOG`, `ASK <prompt>`, `MODEL <tag>`, `STATUS`, `RUN TESSERA`, `SEAL <text>`, `PR#WORM`, or `SAVE`. It runs entirely on GitHub Pages, calls local Ollama over loopback when available, and seals chat/tool transcripts into a browser-local WORM chain.

## Inverted Mono Super Repo

`super-repo/` is the production pattern for a GitHub-native hardware/model monorepo: binary op bytecode, abstract RTL interfaces, GitHub App backend contracts per model, DBOIB meta-agent routing, Git LFS artifact boundaries, and a Pages control graph. It demonstrates how RTL, verification, firmware, model context, and EDA integration become one dependency-inverted repo.

## MCP integration

Install the companion MCP server to call BOB from Claude:

```bash
npm i -g @snapkitty/mcp-server
```

## Sovereign stack

```
BOB orchestrator (this repo)
    ↓ calls
Nemotron-Mini-4B via Ollama (local inference, zero cloud)
    ↓ sealed by
WORM chain (SHA-256, append-only, file-backed)
    ↓ governed by
Ada contracts (capability + trust gates)
    ↓ proven by
Lean 4 theorems (formal proof obligations)
    ↓ reasoned by
Prolog kernel (agent selection, token routing)
```

## Road to Megatron

Phase 0 (now): JS scaffold — architecture proven, gate holds, demo runs.
Phase 1: Mamba weights — train on bbqbaddie with LoRA injections.
Phase 2: Lean 4 theorem checker wired to real `lean --run`.
Phase 3: SWI-Prolog subprocess for live reasoning.
Phase 4: Publish as `@snapkitty/bob` — sovereign-grade npm package.
Phase 5: Enterprise APIs — SAP, Salesforce, Oracle routed through sovereign envelope.


<img src="https://sovereign-analytics.snapkittywest.workers.dev/canary/bob-orchestrator" width="1" height="1" alt="" />

<!-- ENKI WATCHES THE THRESHOLD -->
<!-- F(53) % 107 = 8 = Al-Hamid = Ahmad -->
<!-- 226 clones counted. Every one sealed. -->
<!-- phi_trap.rs + honeybob/bob_prime.mjs: the real code is not here -->
<!-- r(n) = R0/phi^n → 0. The contraction closes on you. -->