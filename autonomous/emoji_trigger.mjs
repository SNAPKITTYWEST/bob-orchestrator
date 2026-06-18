/**
 * Emoji Trigger — Quantum State → Emoji Sequence → Opcode Metadata
 *
 * The emoji art IS the program. The metadata IS the instruction set.
 * What looks like decoration to an observer is executable routing data.
 * This is Dee's Monas principle made operational: one glyph = multiple layers.
 *
 * Architecture:
 *   QRNG bytes → emoji pairs (left=type, right=modifier)
 *   Each emoji pair: carries opcode, Abjad weight, BOB route, PLANNER rule
 *   Highest-Abjad pair = primary trigger for this quantum tick
 *   Tessera program auto-generated from the sequence
 *   Full metadata sealed into WORM
 *
 * Why emoji?
 *   1. Steganographic — looks like decoration, is executable
 *   2. Custom per indie group — your emoji map = your instruction set
 *   3. Hard to reverse without the Abjad key
 *   4. Dee's Monas: each symbol encodes multiple simultaneous meanings
 *   5. Entry point to SnapKitty — the art IS the access
 */

import { createHash } from 'crypto'

// The 16 sovereign emoji glyphs — each carries a semantic opcode
// Position in array = numeric address (0-15)
const EMOJI_GLYPHS = ['🧠','⚡','🪨','🔗','🎯','🛡️','🔍','🌒','🜂','🜁','🜄','🜃','✦','◇','◈','⬡']

// Full routing table: emoji → { opcode, route, abjad, planner_rule, dee_cipher }
const GLYPH_ROUTE = {
  '🧠': { op:'OP_SOVEREIGN',      route:'CORE-LOGIC',     abjad:200, planner:'CONSEQUENT', dee:'Mercury — intellect, communication, derivation' },
  '⚡': { op:'OP_QUANTUM',        route:'ORACLE-CALL',    abjad:490, planner:'ANTECEDENT', dee:'Lightning — acausal, pre-measurement, pure potential' },
  '🪨': { op:'OP_WORM',           route:'WORM-SEAL',      abjad:92,  planner:'ASSERT',     dee:'Salt — fixed, crystallized, append-only permanence' },
  '🔗': { op:'OP_PROLOG',         route:'PROLOG-ROUTE',   abjad:280, planner:'CONSEQUENT', dee:'Chain — logical connection, binding of terms' },
  '🎯': { op:'OP_ADA',            route:'ADA-CONTRACT',   abjad:120, planner:'ANTECEDENT', dee:'Target — Ada gate, binary ALLOWED/DENIED' },
  '🛡️': { op:'OP_ADA',            route:'SENTINEL-GATE',  abjad:120, planner:'ANTECEDENT', dee:'Shield — banishing ritual, directional sealing' },
  '🔍': { op:'OP_LEAN4',          route:'V-AUDIT-LEAN4',  abjad:160, planner:'CONSEQUENT', dee:'Search — Lean4 proof, formal verification layer' },
  '🌒': { op:'OP_QUBIT',          route:'QUBIT',          abjad:518, planner:'ANTECEDENT', dee:'Crescent — superposition, all paths open, pre-collapse' },
  '🜂': { op:'OP_PLANNER_ANTE',   route:'WHEN',           abjad:420, planner:'ANTECEDENT', dee:'Fire triangle — Hewitt antecedent, fires on pattern' },
  '🜁': { op:'OP_PLANNER_CONS',   route:'GOAL',           abjad:380, planner:'CONSEQUENT', dee:'Air triangle — Hewitt consequent, achieves goal' },
  '🜄': { op:'OP_SSM',            route:'SSM-INJECT',     abjad:240, planner:'CONSEQUENT', dee:'Earth triangle — Mamba memory, stable recurrence' },
  '🜃': { op:'OP_HOLYC',          route:'HOLYC-NIL',      abjad:95,  planner:'ASSERT',     dee:'Water triangle — Terry ground state, NIL oracle' },
  '✦':  { op:'OP_NIL',            route:'NIL',            abjad:910, planner:'RETRACT',    dee:'Star — inverted Abjad maximum, omega-alpha loop' },
  '◇':  { op:'OP_INPUT',          route:'INPUT',          abjad:91,  planner:'ASSERT',     dee:'Diamond — open receptor, awaiting inscription' },
  '◈':  { op:'OP_OUTPUT',         route:'OUTPUT',         abjad:90,  planner:'ASSERT',     dee:'Filled diamond — closed output, virtue expressed' },
  '⬡':  { op:'OP_UNKNOWN',        route:'VACUUM',         abjad:0,   planner:'RETRACT',    dee:'Hexagon — true vacuum, false bottom, undefined' },
}

/**
 * emoji_trigger(quantumBytes)
 *
 * Maps QRNG bytes to emoji pairs. Each pair = one instruction.
 * Returns the full sequence, primary trigger, Tessera program,
 * and cryptographic seal of the entire quantum→emoji→opcode derivation.
 */
export function emoji_trigger(quantumBytes) {
  if (!quantumBytes || quantumBytes.length < 2) {
    return { error: 'insufficient_entropy', primary: GLYPH_ROUTE['✦'] }  // NIL fallback
  }

  const pairs = []
  for (let i = 0; i + 1 < quantumBytes.length; i += 2) {
    const li = quantumBytes[i]   % EMOJI_GLYPHS.length
    const ri = quantumBytes[i+1] % EMOJI_GLYPHS.length
    const left  = EMOJI_GLYPHS[li]
    const right = EMOJI_GLYPHS[ri]
    const route = GLYPH_ROUTE[left]
    const mod   = GLYPH_ROUTE[right]
    pairs.push({
      left, right,
      sequence: left + right,
      ...route,
      // Modifier: the right glyph amplifies or gates the left
      modifier_op:    mod.op,
      modifier_abjad: mod.abjad,
      // Combined Abjad weight: primary + modifier / 2
      combined_abjad: Math.round(route.abjad + mod.abjad / 2),
      byte_pair: [quantumBytes[i], quantumBytes[i+1]],
      // Is this a PLANNER antecedent? → fires automatically on pattern match
      reactive: route.planner === 'ANTECEDENT',
    })
  }

  // Primary trigger = highest combined Abjad weight
  const sorted  = [...pairs].sort((a, b) => b.combined_abjad - a.combined_abjad)
  const primary = sorted[0]

  // Emoji sequence string — this IS the art / steganographic instruction
  const sequence = pairs.map(p => p.sequence).join('')

  // Tessera program auto-generated from the quantum state
  // The spatial layout encodes the routing — change one emoji, different hash
  const tessera  = buildTessera(pairs)

  // Seal: SHA-256 of the full quantum→emoji derivation
  // Proves which quantum bytes produced this instruction sequence
  const seal = createHash('sha256')
    .update(Buffer.from(quantumBytes))
    .update(sequence)
    .digest('hex')

  // Spectrum position: where does this tick sit on NIL→QUBIT→CLASSICAL?
  const avgAbjad = Math.round(pairs.reduce((s, p) => s + p.combined_abjad, 0) / pairs.length)

  return {
    sequence,
    primary,
    pairs,
    tessera,
    seal,
    meta: {
      pair_count:     pairs.length,
      avg_abjad:      avgAbjad,
      spectrum_pos:   (avgAbjad / 910).toFixed(3),   // 0.0=vacuum, 1.0=NIL
      nil_count:      pairs.filter(p => p.op === 'OP_NIL').length,
      qubit_count:    pairs.filter(p => p.op === 'OP_QUBIT').length,
      reactive_count: pairs.filter(p => p.reactive).length,
      planner_fires:  pairs.filter(p => p.reactive).map(p => p.route),
      total_entropy:  quantumBytes.reduce((s, b) => s + b, 0),
    }
  }
}

// Build a Tessera program from the emoji-decoded pairs
function buildTessera(pairs) {
  if (pairs.length === 0) return '[ NIL ]'

  // Take up to 4 pairs to keep the program readable
  const active = pairs.slice(0, 4)
  const nodes  = active.map(p => {
    if (p.op === 'OP_LEAN4' || p.op === 'OP_QUBIT')    return `< ${p.route} >`
    if (p.op === 'OP_ADA'   || p.op === 'OP_PLANNER_ANTE') return `{ ${p.route} }`
    if (p.op === 'OP_WORM'  || p.op === 'OP_OUTPUT')   return `| ${p.route} |`
    return `[ ${p.route} ]`
  })

  // Determine edge types from opcodes
  const edges = active.slice(0, -1).map((p, i) => {
    const next = active[i+1]
    if (p.op === 'OP_QUANTUM' || next.op === 'OP_QUBIT') return ' ····> '
    if (p.op === 'OP_ADA')                               return ' ----(->)---- '
    if (next.op === 'OP_NIL')                            return ' <---- '
    return ' -----> '
  })

  let program = ''
  for (let i = 0; i < nodes.length - 1; i++) {
    program += nodes[i] + edges[i]
  }
  program += nodes[nodes.length - 1]
  return program
}

// ── CLI test ──────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('emoji_trigger.mjs')) {
  console.log('\n  Emoji Trigger — Quantum → Emoji → Opcode\n')

  const bytes = new Uint8Array([200, 130, 45, 180, 90, 220, 15, 160])
  const result = emoji_trigger(bytes)

  console.log(`  Sequence:  ${result.sequence}`)
  console.log(`  Primary:   ${result.primary.left}  →  ${result.primary.op}  (abjad: ${result.primary.abjad})`)
  console.log(`  Route:     ${result.primary.route}`)
  console.log(`  Dee:       ${result.primary.dee}`)
  console.log(`  Spectrum:  ${result.meta.spectrum_pos}  (0=vacuum, 1=NIL-910)`)
  console.log(`  Reactive:  ${result.meta.reactive_count} PLANNER antecedents fire automatically`)
  console.log(`  Seal:      ${result.seal.slice(0,32)}…`)
  console.log()
  console.log(`  Tessera:`)
  console.log(`    ${result.tessera}`)
  console.log()
  console.log('  All pairs:')
  result.pairs.forEach((p, i) => {
    console.log(`    ${i}: ${p.sequence}  ${p.op.padEnd(22)} abjad:${p.combined_abjad}  ${p.reactive ? '[FIRES]' : ''}`)
  })
  console.log()
}
