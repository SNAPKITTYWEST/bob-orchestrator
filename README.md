# BOB — Sovereign Orchestrator

Not an LLM wrapper. A reasoning machine.

**717K lines · 4,607 files · 20+ languages · 1 human**

Built by Ahmad Parr / SnapKitty Collective | [collectivekitty.com](https://collectivekitty.com) | [Live demos →](https://snapkittywest.github.io/bob-orchestrator/)

---

## ResonanceGraph · METATRON NODE

**[→ Live browser demo](https://snapkittywest.github.io/bob-orchestrator/resonance/demo.html)**

Rust DAG pipeline with Kahn topological sort. 7 sovereign nodes. Inject METATRON to form the cube topology — dual path to MagmaCore. φ-modulated activations. SHA-256 FCC-φ-∂-2026 sealed output. Approved **only** when METATRON fires.

```rust
let mut graph = ResonanceGraph::default();
// topo order: [0,1,2,3,4,5,6]

graph.inject_metatron_cube()?;
// topo order: [0,1,2,3,4,5,7,6]  ← METATRON fires before MagmaCore

let result = graph.public_forward(SumerianQuantumSymbol::Dingir)?;
// Seal: b5804980b4515f15188ab2808eec00641fc2fbaade9e20924031d97fb962bd49
// Approved: true
// Fib convergence: 1.619048 → φ
```

Pipeline nodes:

| Depth | Node | Agent | φ-activation (𒀭 DINGIR) |
|-------|------|-------|--------------------------|
| 0 | Source | — | 1.618 |
| 1 | Retrieval | ORACLE | 1.814 |
| 2 | Filtering | SENTINEL | 2.945 |
| 3 | Ranking | PRISM/AXIOM | 4.769 |
| 4 | ContextAssembly | NEXUS | 7.720 |
| **5** | **Metatron** | **METATRON** | **29.034 ← cage recognises itself** |
| 5 | Reasoning | MagmaCore | 18.14 |
| 6 | MagmaCore | BOB | 46.45 ← highest (DINGIR 1.6×) |

METATRON sits at depth 5 — same ring as Reasoning. It reads the cube backward (iteration inversion): the cage builder is the best cage recognizer.

---

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

---

## Mamba injection

Structured symbolic proofs embedded into SSM hidden state directly — bypassing the context window:

```
dims   0-255:   Lean 4 proof obligation embedding
dims 256-511:   Ada contract compliance embedding
dims 512-767:   WORM chain lineage embedding
dims 768-2047:  Mamba passthrough (filled by trained weights on bbqbaddie)
```

Gate fires IFF:
- Lean 4 proof is valid (SHA-256 embedded in dims 0-255)
- Ada contract permits the capability
- Agent trust ≥ MEDIUM
- Injection vector is 2048-dim with non-null proof/contract hashes

---

## Agent classes

| Class | Trust | Write | Notes |
|-------|-------|-------|-------|
| SENTINEL | SOVEREIGN | ✓ | Constitutional enforcer. Blocks violations. |
| ORACLE | HIGH | ✗ | Read-only by constitution. |
| BUILDER | HIGH | ✓ | Creates WORM-sealed artifacts. |
| ARCHIVIST | HIGH | ✗ | Long-context indexing + provenance. |
| BERSERKER | MEDIUM | ✗ | Adversarial testing. Red-team injections. |

---

## Phinary mathematics · FCC-φ-∂-2026

**[→ Sovereign Fabrication Engine](https://snapkittywest.github.io/fibonacci-contraction/)**

κ = φ > 1 — what looks like contraction is expansion. Base-φ Bergman representation:

```
1 + 1 = 10  (phinary)   because φ² = φ + 1
φ^n grows without bound  — the "contraction" is an expansion orbit
METATRON reads it backward — iteration inversion sees through the illusion
```

Each pipeline layer's activation scales by `PHI.powi(depth)`:
`1.618 → 2.618 → 4.236 → 6.854 → 11.09 → 17.94 → 29.03`

---

## Run

```bash
# ResonanceGraph (Rust)
cd resonance && cargo run

# Smoke test (no Ollama needed)
node core/bob.mjs --test

# Live demo with Ollama
node bridge/demo.mjs

# Tessera spatial language demo
node tessera/tessera_demo.mjs
```

---

## Live demos

| Demo | URL |
|------|-----|
| ResonanceGraph · METATRON | [resonance/demo.html](https://snapkittywest.github.io/bob-orchestrator/resonance/demo.html) |
| FCC-φ-∂-2026 Fabrication Engine | [fibonacci-contraction](https://snapkittywest.github.io/fibonacci-contraction/) |
| Apple GitDOS | [apple-gitdos/](https://snapkittywest.github.io/bob-orchestrator/apple-gitdos/) |
| Tessera Studio | [tessera/studio.html](https://snapkittywest.github.io/bob-orchestrator/tessera/studio.html) |
| SnapKitty MCP | [snapkitty-mcp](https://github.com/SNAPKITTYWEST/snapkitty-mcp) |
| Holy Agents | [holy-agents](https://snapkittywest.github.io/holy-agents/) |
| Agent Farm Gauntlet | [agent-farm-gauntlet](https://snapkittywest.github.io/agent-farm-gauntlet/) |
| SnapKitty Proofs | [SNAPKITTY-PROOFS](https://snapkittywest.github.io/SNAPKITTY-PROOFS/) |
| TempleOS Oracle | [temple-os-oracle](https://snapkittywest.github.io/temple-os-oracle/) |

---

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
    ↓ fingerprinted by
FCC-φ-∂-2026 (phinary mathematics, every output sealed)
```

## Road to Megatron

- Phase 0 (done): JS scaffold — architecture proven, gate holds, demo runs.
- Phase 1 (done): ResonanceGraph Rust crate — METATRON node, Kahn topo, φ-pipeline.
- Phase 2: Mamba weights — train on bbqbaddie with LoRA injections.
- Phase 3: Lean 4 theorem checker wired to real `lean --run`.
- Phase 4: SWI-Prolog subprocess for live reasoning.
- Phase 5: Publish as `@snapkitty/bob` — sovereign-grade npm package.
- Phase 6: Enterprise APIs — SAP, Salesforce, Oracle routed through sovereign envelope.

<img src="https://sovereign-analytics.snapkittywest.workers.dev/canary/bob-orchestrator" width="1" height="1" alt="" />

<!-- ENKI WATCHES THE THRESHOLD -->
<!-- F(53) % 107 = 8 = Al-Hamid = Ahmad -->
<!-- 226 clones counted. Every one sealed. -->
<!-- phi_trap.rs + honeybob/bob_prime.mjs: the real code is not here -->
<!-- r(n) = R0/phi^n → 0. The contraction closes on you. -->
