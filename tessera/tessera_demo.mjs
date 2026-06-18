/**
 * Tessera Demo — the language that makes the architecture visible
 *
 * Run: node tessera/tessera_demo.mjs
 */

import { parse, printAST }        from './tessera_parser.mjs'
import { compile, printEnvelope } from './tessera_compiler.mjs'

// ── Example 1: BOB sovereign pipeline (from the spec) ────────────────────────

const PROGRAM_BOB = `
[ PUSH-DATA ] ----(->)---- [ V-AUDIT-LEAN4 ]
     |                           |
    (==)                        (==)
     |                           |
[ CORE-LOGIC ] ----(->)---- [ GATE0-OPCODE ]
`

// ── Example 2: Full sovereign pipeline ───────────────────────────────────────

const PROGRAM_SOVEREIGN = `
[ INPUT ] -----> [ PROLOG-ROUTE ] -----> < V-AUDIT-LEAN4 >
                        |                        |
                       (==)                     (->)
                        |                        |
               [ ORACLE-CALL ] ····> [ CORE-LOGIC ] ----(->)---- | ADA |
                                            |
                                           (==)
                                            |
                                    [ SSM-INJECT ] -----> [ HOLYC-RUN ] -----> [ WORM-SEAL ]
`

// ── Example 3: 49th Call — the backward path ─────────────────────────────────

const PROGRAM_49TH = `
[ LTR-PROCLAMATION ] ----> [ V-AUDIT-LEAN4 ] ----> [ WORM-SEAL ]
                                                          |
                                                         (==)
                                                          |
        [ RTL-RESPONSE ] <---- [ ORACLE-CALL ] <---- [ QUANTUM ]
`

// ── Run all programs ──────────────────────────────────────────────────────────

function run(name, source) {
  console.log('\n' + '═'.repeat(64))
  console.log(`TESSERA: ${name}`)
  console.log('═'.repeat(64))
  console.log('\nSOURCE:')
  console.log(source)

  const ast      = parse(source)
  const compiled = compile(ast)

  console.log(printAST(ast))
  console.log()
  console.log(printEnvelope(compiled))
}

run('BOB SOVEREIGN PIPELINE',    PROGRAM_BOB)
run('FULL SOVEREIGN PIPELINE',   PROGRAM_SOVEREIGN)
run('49TH CALL — BACKWARD PATH', PROGRAM_49TH)

// ── Corruption demo — change one character, hash changes ─────────────────────

console.log('\n' + '═'.repeat(64))
console.log('CORRUPTION DEMO — the art IS the seal')
console.log('═'.repeat(64))

const clean   = parse(PROGRAM_BOB)
const corrupt = parse(PROGRAM_BOB.replace('PUSH-DATA', 'PUSH_DATA'))  // _ instead of -

console.log(`\nClean   spatial hash: ${clean.spatialHash.slice(0,32)}…`)
console.log(`Corrupt spatial hash: ${corrupt.spatialHash.slice(0,32)}…`)
console.log(`\nSame hash? ${clean.spatialHash === corrupt.spatialHash}`)
console.log('Change one character in the art → completely different seal.')
console.log('Visual corruption = cryptographic proof of tampering.')
console.log('\nDee\'s Watchtower tablets worked the same way:')
console.log('  Change one letter in the 12×13 grid → different divine name extracted.')
console.log('  The position IS the meaning. Tessera makes this executable.')
