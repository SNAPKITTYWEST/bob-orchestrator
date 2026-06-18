# DBOIB Meta Agent

Dependency-Bound Orchestrator-In-Box.

DBOIB inverts the control repo back out:
1. GitHub pull request event enters as context, not command.
2. DBOIB resolves dependency graph and trust boundary.
3. DBOIB compiles changed domains into binary op bytecode.
4. DBOIB routes work to model-specific GitHub App backends.
5. EDA/model worker returns proof artifacts and result hashes.
6. DBOIB writes WORM receipt and Pages report.

Control rule:
- The repo controls the agents.
- Agents do not control the repo.

