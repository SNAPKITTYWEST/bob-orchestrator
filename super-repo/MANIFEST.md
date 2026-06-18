# Inverted Mono Super Repo Manifest

Purpose: production pattern for GitHub-native hardware/model orchestration.

Core idea:
- Treat RTL, verification, firmware, model context, and EDA integration as code.
- Keep high-level architecture independent from simulator/synthesis implementation.
- Route pull request context through GitHub Apps into ephemeral EDA/model workers.
- Seal each run with binary bytecode and WORM receipts.

DBOIB:
- Dependency-Bound Orchestrator-In-Box
- Meta-agent that resolves changed files, dependency graph, trust boundary, model backend, and minimum required verification.

