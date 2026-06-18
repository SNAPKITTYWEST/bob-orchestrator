/**
 * HolyC NIL — The Ground State Oracle
 *
 * Terry Davis: entropy came from keyboard timing (KbdMsEvtTime >> GOD_BAD_BITS).
 * When no word emerged → NIL. God was silent.
 *
 * NIL in inverted Abjad: ن(50) + ي(10) + ل(30) = 90 forward, 910 inverted.
 * NIL is NOT zero. It is the maximum reflection — omega looping back to alpha.
 * The oracle is silent not because nothing is there — because everything is.
 *
 * Architecture:
 *   QRNG bytes XOR keyboard timestamp → sovereign entropy
 *   Entropy below threshold → NIL state (910) — maximum inverted weight
 *   Entropy above threshold → WORD selected → virtue expressed
 *   Word feeds directly into emoji_trigger → autonomous agent fires
 */

// Terry's sacred vocabulary — BOB extends it with sovereign opcodes
const SACRED_WORDS = [
  // Terry's HolyC universe
  'SOVEREIGN', 'TRUTH', 'GATE', 'SEAL', 'ORACLE', 'VOID', 'KINGDOM',
  'WISDOM', 'SPIRIT', 'FIRE', 'LIGHT', 'WORD', 'PATH', 'NAME',
  // BOB sovereign extensions
  'PROLOG', 'QUBIT', 'QUANTUM', 'TRUST', 'LEAN', 'MAMBA', 'WORM',
  'NIL', 'ADA', 'PLANNER', 'ACTOR', 'HEWITT', 'PATTERN', 'MATCH',
  // Enochian / Dee layer
  'LIL', 'ARN', 'ZOM', 'PAZ', 'LIT', 'MAZ', 'DEO', 'ZID',
  // Abjad seed words
  'NUN', 'YAA', 'LAM', 'QAF', 'WAW', 'BAA',
]

// Abjad letter values (Arabic): each letter → numeric weight
const ABJAD = {
  A:1,B:2,J:3,D:4,H:5,W:6,Z:7,X:8,T:9,Y:10,
  K:20,L:30,M:40,N:50,S:60,E:70,F:80,P:90,Q:100,
  R:200,SH:300,TH:400
}

function abjadWeight(word) {
  return [...word.toUpperCase()].reduce((sum, ch) => sum + (ABJAD[ch] || ch.charCodeAt(0) % 10), 0)
}

// Terry's GOD_BAD_BITS — reduces precision of timing entropy
// He used this to make the oracle "coarser" — less deterministic
const GOD_BAD_BITS = 4

/**
 * holyc_nil(quantumBytes, kbdTimingMs?)
 *
 * Merges quantum entropy with optional keyboard timing (Terry's ritual preserved).
 * Returns NIL or WORD state.
 *
 * NIL threshold: mean byte value < 25 (bottom ~10% of 0-255 range)
 * At NIL: oracle is silent. Agent holds. Abjad weight = 910 (inverted maximum).
 * At WORD: virtue expressed. Agent fires.
 */
export function holyc_nil(quantumBytes, kbdTimingMs = Date.now()) {
  if (!quantumBytes || quantumBytes.length === 0) {
    return { state: 'NIL', word: null, reason: 'no_entropy', abjad: 910 }
  }

  // XOR quantum bytes with keyboard timing (Terry's human-in-the-loop ritual)
  const kbdEntropy = (kbdTimingMs >> GOD_BAD_BITS) & 0xFFFF
  const merged = quantumBytes.map((b, i) => b ^ ((kbdEntropy >> (i % 16)) & 0xFF))

  const mean   = merged.reduce((s, b) => s + b, 0) / merged.length
  const spread = Math.max(...merged) - Math.min(...merged)

  // NIL check — low entropy = oracle silent
  // mean < 25 → bottom 10% → NIL (inverted maximum — not nothing, just unspoken)
  if (mean < 25) {
    return {
      state:      'NIL',
      word:       null,
      reason:     'entropy_below_threshold',
      mean,
      spread,
      abjad:      910,          // inverted Abjad NIL weight
      shifted:    mean >> GOD_BAD_BITS,
      raw_bytes:  quantumBytes.slice(0, 4),
      merged_bytes: merged.slice(0, 4),
    }
  }

  // WORD — Terry's oracle: select from sacred vocabulary
  // Use first byte (highest entropy) as primary selector
  const index = Math.floor((merged[0] / 255) * SACRED_WORDS.length) % SACRED_WORDS.length
  const word  = SACRED_WORDS[index]
  const weight = abjadWeight(word)

  // Dee's cipher layer: XOR the word index with the keyboard timing
  // This is the "neither the key nor the lock alone" — both needed to decode
  const deeIndex = (index ^ (kbdEntropy & 0xFF)) % SACRED_WORDS.length
  const deeWord  = SACRED_WORDS[deeIndex]

  return {
    state:        'WORD',
    word,
    dee_word:     deeWord,       // Dee cipher variant — keyboard timing changes meaning
    reason:       'entropy_sufficient',
    mean,
    spread,
    abjad:        weight,
    shifted:      Math.floor(mean) >> GOD_BAD_BITS,
    raw_bytes:    quantumBytes.slice(0, 4),
    merged_bytes: merged.slice(0, 4),
    // Virtue: does this word carry sovereign potency?
    // Words with Abjad weight ≥ 100 are considered "high virtue"
    virtue:       weight >= 100 ? 'HIGH' : weight >= 50 ? 'MEDIUM' : 'LOW',
  }
}

/**
 * Batch oracle — runs N consultations with shifting entropy
 * Each consultation XORs a different offset of the quantum bytes.
 * Simulates Terry's repeated OK-dialog presses.
 */
export function holyc_oracle_batch(quantumBytes, n = 4) {
  const results = []
  for (let i = 0; i < n; i++) {
    const shifted = quantumBytes.map((b, j) => b ^ (i * 37 + j) & 0xFF)
    results.push(holyc_nil(shifted, Date.now() + i * 1000))
  }
  return {
    consultations: results,
    words:   results.filter(r => r.state === 'WORD').map(r => r.word),
    nils:    results.filter(r => r.state === 'NIL').length,
    verdict: results.filter(r => r.state === 'WORD').length >= Math.ceil(n / 2)
      ? 'ORACLE_SPEAKS'   // majority consulted → virtue flows
      : 'ORACLE_SILENT',  // majority NIL → hold
  }
}

// ── CLI test ──────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('holyc_nil.mjs')) {
  console.log('\n  HolyC NIL — Ground State Oracle\n')

  const NIL_bytes  = new Uint8Array([3, 1, 8, 2, 5, 4, 7, 3])    // low entropy → NIL
  const WORD_bytes = new Uint8Array([200, 180, 220, 190, 210, 175, 240, 160]) // high → WORD

  console.log('  Low entropy (NIL expected):')
  const nil = holyc_nil(NIL_bytes)
  console.log(`    state:  ${nil.state}`)
  console.log(`    abjad:  ${nil.abjad}  (inverted maximum — omega looping to alpha)`)
  console.log(`    mean:   ${nil.mean?.toFixed(2)}`)
  console.log()

  console.log('  High entropy (WORD expected):')
  const word = holyc_nil(WORD_bytes)
  console.log(`    state:  ${word.state}`)
  console.log(`    word:   ${word.word}`)
  console.log(`    dee:    ${word.dee_word}  (keyboard-shifted variant)`)
  console.log(`    abjad:  ${word.abjad}`)
  console.log(`    virtue: ${word.virtue}`)
  console.log()

  console.log('  Batch oracle (4 consultations):')
  const batch = holyc_oracle_batch(WORD_bytes)
  console.log(`    words:   ${batch.words.join(', ')}`)
  console.log(`    nils:    ${batch.nils}`)
  console.log(`    verdict: ${batch.verdict}`)
  console.log()
}
