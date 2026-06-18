/**
 * BOB Demo — runs the full sovereign pipeline with a live Ollama call
 * node bridge/demo.mjs
 *
 * Shows: SENTINEL → Lean 4 proof gate → Ada contract → SSM injection → Ollama → WORM seal
 */
import { createAgent, sovereignStep, worm } from '../core/bob.mjs'

const MODEL        = 'nemotron'
const OLLAMA_HOST  = 'http://localhost:11434'

const THEOREM = `
theorem sovereign_demo :
  ∀ (a : String) (trust : Nat),
    trust ≥ 2 →
    ∃ (seal : String), seal.length = 64 := by
  intro a trust h
  exact ⟨"0".repeat(64), by simp⟩
`.trim()

const ADA_CONTRACT = `
package Demo_Contract is
   Agent_Name  : constant String := "BUILDER-DEMO";
   Agent_Class : constant String := "BUILDER";
   Trust_Level : constant String := "HIGH";
   Capability  : constant String := "generate";
end Demo_Contract;
`

async function run () {
  console.log('\n  ╔══════════════════════════════════════════════════╗')
  console.log('  ║  BOB Sovereign Orchestrator — Live Demo          ║')
  console.log('  ╚══════════════════════════════════════════════════╝\n')

  const builder = createAgent('BUILDER-DEMO', 'BUILDER', ['write', 'read', 'generate', 'seal'])
  console.log(`  Agent: ${builder.name} [${builder.agentClass}] trust=${builder.trust}`)
  console.log(`  Born:  ${builder.worm_seal.slice(0, 32)}…\n`)

  console.log('  ① Submitting sovereign step to BOB…')
  console.log(`     Theorem: ${THEOREM.slice(0, 60)}…`)
  console.log(`     Ollama:  ${OLLAMA_HOST} model=${MODEL}\n`)

  const t0     = Date.now()
  const result = await sovereignStep({
    agentId:        builder.id,
    task:           'explain_mamba_ssm',
    input:          'In one sentence, what is the core idea behind Mamba state space models?',
    lean4Theorem:   THEOREM,
    adaContractText: ADA_CONTRACT,
    ollamaHost:     OLLAMA_HOST,
    model:          MODEL
  })
  const ms = Date.now() - t0

  if (!result.ok) {
    console.error(`  ✗  Step failed: ${result.error}`)
    process.exit(1)
  }

  console.log('  ② Gate results:')
  console.log(`     Proof hash:    ${result.proof_hash.slice(0, 32)}…`)
  console.log(`     Contract hash: ${result.contract_hash.slice(0, 32)}…`)
  console.log(`     SSM state:     ${result.ssm_state.toFixed(6)}`)
  console.log(`     Inject dims:   ${result.injection_dim}`)
  console.log(`     Gate:          ${result.gate}`)

  if (result.llm_reply) {
    console.log('\n  ③ Ollama reply (Nemotron):')
    console.log('  ┌─────────────────────────────────────────────────')
    result.llm_reply.split('\n').forEach(l => console.log('  │ ' + l))
    console.log('  └─────────────────────────────────────────────────')
  } else {
    console.log('\n  ③ Ollama offline — orchestrator ran without LLM (sovereign)')
  }

  console.log('\n  ④ WORM seal:')
  console.log(`     ${result.worm_seal}`)
  console.log(`     Chain length: ${result.worm_chain} events`)
  console.log(`     Verify: ${JSON.stringify(worm.verify())}`)

  console.log(`\n  Done in ${ms}ms. BOB is sovereign.\n`)
}

run().catch(e => { console.error(e); process.exit(1) })
