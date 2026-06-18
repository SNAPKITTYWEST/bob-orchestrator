const examples = {
  planner: `
{ WHEN: pattern=SOVEREIGN_TASK } ----(->)---- [ PROLOG-ROUTE ]
                 |                                    |
                (==)                                 (==)
                 |                                    |
{ GOAL: achieve=WORM_SEAL } -----> [ ORACLE-CALL ] ····> [ QUBIT ]
                                                               |
                                                              (==)
                                                               |
                                                     [ CORE-LOGIC ] ----(->)---- | ADA |
`.trim(),
  nilqubit: `
[ NIL ] ----(->)---- [ QUBIT ] ····> [ ORACLE-CALL ]
  |                     |                   |
 (==)                  (==)                (==)
  |                     |                   |
[ INPUT ] -----> [ PROLOG-ROUTE ] -----> [ CORE-LOGIC ] ----(->)---- [ WORM-SEAL ]
`.trim(),
  bob: `
[ PUSH-DATA ] ----(->)---- [ V-AUDIT-LEAN4 ]
     |                           |
    (==)                        (==)
     |                           |
[ CORE-LOGIC ] ----(->)---- [ GATE0-OPCODE ]
`.trim(),
  full: `
[ INPUT ] -----> [ PROLOG-ROUTE ] -----> < V-AUDIT-LEAN4 >
                        |                        |
                       (==)                     (->)
                        |                        |
               [ ORACLE-CALL ] ····> [ CORE-LOGIC ] ----(->)---- | ADA |
                                            |
                                           (==)
                                            |
                                    [ SSM-INJECT ] -----> [ HOLYC-RUN ] -----> [ WORM-SEAL ]
`.trim(),
  call49: `
[ LTR-PROCLAMATION ] -----> [ WORM-SEAL ] ···> [ QUANTUM-SEED ]
          ^                                               |
          |                                             (==)
          |                                               |
[ RTL-RESPONSE ] <----- [ BACKWARD-PATH ] <----- | ADA-CONTRACT |
`.trim()
}

const opcodes = {
  'PUSH-DATA': 'OP_INPUT',
  'INPUT': 'OP_INPUT',
  'V-AUDIT-LEAN4': 'OP_LEAN4',
  'LEAN4': 'OP_LEAN4',
  'VERIFY': 'OP_LEAN4',
  'V-AUDIT-ADA': 'OP_ADA',
  'ADA': 'OP_ADA',
  'ADA-CONTRACT': 'OP_ADA',
  'GATE0-OPCODE': 'OP_ADA',
  'CORE-LOGIC': 'OP_SOVEREIGN',
  'ORACLE-CALL': 'OP_QUANTUM',
  'QUANTUM-SEED': 'OP_QUANTUM',
  'WORM-SEAL': 'OP_WORM',
  'WORM': 'OP_WORM',
  'PROLOG-ROUTE': 'OP_PROLOG',
  'SSM-INJECT': 'OP_SSM',
  'HOLYC-RUN': 'OP_HOLYC',
  'LTR-PROCLAMATION': 'OP_OUTPUT',
  'RTL-RESPONSE': 'OP_OUTPUT',
  'BACKWARD-PATH': 'OP_SOVEREIGN',
  // NIL — inverted Abjad ن+ي+ل = 90, complement = 910
  // The ground state. Maximum inverted weight. The omega that loops to alpha.
  'NIL': 'OP_NIL',
  'NILL': 'OP_NIL',
  // QUBIT — pre-collapse superposition. All paths open, equal weight.
  'QUBIT': 'OP_QUBIT',
  'SUPERPOSE': 'OP_QUBIT',
  // PLANNER nodes — pattern-directed invocation (Hewitt 1969)
  // Fires automatically when the named pattern arrives. No explicit call needed.
  'WHEN': 'OP_PLANNER_ANTE',   // antecedent theorem: IF pattern THEN fire
  'GOAL': 'OP_PLANNER_CONS',   // consequent theorem: TO achieve goal, TRY this
  'ASSERT': 'OP_PLANNER_ASSERT',
  'RETRACT': 'OP_PLANNER_RETRACT',
}

// Abjad weights — Arabic letter-number system (ا=1 … غ=1000)
// Used to assign semantic weight to each opcode on the NIL→QUBIT spectrum.
// NIL (ن=50 ي=10 ل=30) = 90 forward, 910 inverted (complement of 1000)
// QUBIT (ق=100 و=6 ب=2 ي=10 ت=400) = 518
// Classical ops cluster between 90–518. Prolog = 518+. Ada = gated.
const ABJAD_WEIGHT = {
  'OP_NIL':             910,   // inverted Abjad — maximum reflection
  'OP_QUBIT':           518,   // pure superposition — all paths equal
  'OP_QUANTUM':         490,   // near-qubit — quantum entropy source
  'OP_PLANNER_ANTE':    420,   // pattern fires automatically
  'OP_PLANNER_CONS':    380,   // goal-directed theorem
  'OP_PLANNER_ASSERT':  340,
  'OP_PLANNER_RETRACT': 300,
  'OP_PROLOG':          280,   // Horn clause resolution — determined logic
  'OP_SSM':             240,   // Mamba state space — learned memory
  'OP_SOVEREIGN':       200,   // BOB orchestrator step
  'OP_LEAN4':           160,   // formal proof obligation
  'OP_ADA':             120,   // contract gate — binary ALLOWED/DENIED
  'OP_HOLYC':            95,   // HolyC simulation — Terry's realm
  'OP_WORM':             92,   // sealed — append-only, collapsed
  'OP_INPUT':            91,   // data entry point
  'OP_OUTPUT':           90,   // collapsed output — NIL-adjacent
  'OP_UNKNOWN':           0,   // unresolved — true vacuum
}

const source = document.getElementById('source')
const hashNode = document.getElementById('hash')
const envelopeNode = document.getElementById('envelope')
const dimsNode = document.getElementById('dims')
const corruptionNode = document.getElementById('corruption')
const artNode = document.getElementById('art')
const compiledNode = document.getElementById('compiled')
const traceNode = document.getElementById('trace')
const esolangSourceNode = document.getElementById('esolang-source')
const cipherOutputNode = document.getElementById('cipher-output')
const glowSealNode = document.getElementById('glow-seal')
const magmaGlyphs = ['🧠', '⚡', '🪨', '🔗', '🎯', '🛡️', '🔍']
const emojiOpcodes = ['🧠', '⚡', '🪨', '🔗', '🎯', '🛡️', '🔍', '🌒', '🜂', '🜁', '🜄', '🜃', '✦', '◇', '◈', '⬡']
let cleanHash = ''
let currentManifest = null
let currentEsolang = 'brainfuck'
let currentForge = null

source.value = examples.full
render()
forge()

document.querySelectorAll('[data-load]').forEach((button) => {
  button.addEventListener('click', () => {
    source.value = examples[button.dataset.load]
    cleanHash = ''
    render()
  })
})

source.addEventListener('input', render)
document.getElementById('corrupt').addEventListener('click', corruptOneChar)
document.getElementById('download-source').addEventListener('click', () => download('program.tes', source.value, 'text/plain'))
document.getElementById('download-svg').addEventListener('click', () => download('tessera.svg', artNode.querySelector('svg').outerHTML, 'image/svg+xml'))
document.getElementById('download-manifest').addEventListener('click', () => download('tessera-manifest.json', JSON.stringify(currentManifest, null, 2), 'application/json'))
document.querySelectorAll('[data-esolang]').forEach((button) => {
  button.addEventListener('click', () => {
    currentEsolang = button.dataset.esolang
    forge()
  })
})
document.getElementById('forge-generate').addEventListener('click', forge)
document.getElementById('forge-message').addEventListener('input', forge)
document.getElementById('cipher').addEventListener('change', forge)
document.getElementById('cipher-key').addEventListener('input', forge)
document.getElementById('forge-to-tessera').addEventListener('click', () => {
  if (!currentForge) return
  source.value = currentForge.tessera
  cleanHash = ''
  render()
})
document.getElementById('download-forge-svg').addEventListener('click', () => {
  download('glowing-esolang-seal.svg', glowSealNode.querySelector('svg').outerHTML, 'image/svg+xml')
})

async function sha256(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parse(src) {
  const lines = src.split('\n')
  const nodes = []
  const nodeAt = new Map()
  const patterns = [
    { open: '[', close: ']', type: 'CELL' },
    { open: '<', close: '>', type: 'VERIFY' },
    { open: '|', close: '|', type: 'CONTRACT' },
    { open: '(', close: ')', type: 'BRIDGE' },
    { open: '{', close: '}', type: 'PLANNER' },  // Hewitt pattern-directed node
  ]
  lines.forEach((line, row) => {
    for (const pattern of patterns) {
      let col = 0
      while (col < line.length) {
        const start = line.indexOf(pattern.open, col)
        if (start < 0) break
        const end = line.indexOf(pattern.close, start + 1)
        if (end < 0) break
        const label = line.slice(start + 1, end).trim()
        if (label && !(pattern.type === 'CONTRACT' && label.length === 0)) {
          const node = { id: `${label}@${row},${start}`, label, type: pattern.type, row, col: start, endCol: end }
          nodes.push(node)
          for (let c = start; c <= end; c++) nodeAt.set(`${row},${c}`, node)
        }
        col = end + 1
      }
    }
  })

  const edges = []
  const horizontal = [
    { re: /\(->?\)/g, type: 'GATE' },
    { re: /·{3,}>/g, type: 'QUANTUM' },
    { re: /<-{2,}/g, type: 'BACKWARD' },
    { re: /-{2,}>/g, type: 'FORWARD' },
    { re: /={3,}/g, type: 'PARALLEL' }
  ]
  lines.forEach((line, row) => {
    for (const { re, type } of horizontal) {
      let match
      while ((match = re.exec(line)) !== null) {
        const start = match.index
        const end = start + match[0].length - 1
        let left = null
        let right = null
        for (let c = start - 1; c >= 0; c--) {
          if (nodeAt.has(`${row},${c}`)) { left = nodeAt.get(`${row},${c}`); break }
        }
        for (let c = end + 1; c < line.length; c++) {
          if (nodeAt.has(`${row},${c}`)) { right = nodeAt.get(`${row},${c}`); break }
        }
        if (left && right) edges.push({ from: left.id, to: right.id, type, row, col: start, axis: 'H' })
      }
    }
  })

  const maxCols = Math.max(...lines.map((line) => line.length))
  for (let col = 0; col < maxCols; col++) {
    for (let row = 0; row < lines.length; row++) {
      const seg = (lines[row] || '').slice(col, col + 4)
      const char = (lines[row] || '')[col] || ''
      const vType = seg === '(==)' ? 'V-GATE' : char === '^' ? 'UP' : char === '|' ? 'DOWN' : null
      if (!vType) continue
      let top = null
      let bottom = null
      for (let r = row - 1; r >= 0; r--) {
        top = nodeAt.get(`${r},${col}`) || nodeAt.get(`${r},${col + 1}`) || nodeAt.get(`${r},${col + 2}`)
        if (top) break
      }
      for (let r = row + 1; r < lines.length; r++) {
        bottom = nodeAt.get(`${r},${col}`) || nodeAt.get(`${r},${col + 1}`) || nodeAt.get(`${r},${col + 2}`)
        if (bottom) break
      }
      if (top && bottom) {
        edges.push({ from: vType === 'UP' ? bottom.id : top.id, to: vType === 'UP' ? top.id : bottom.id, type: vType, row, col, axis: 'V' })
      }
    }
  }
  return { source: src, nodes, edges, dims: { rows: lines.length, cols: maxCols } }
}

function compile(ast, spatialHash) {
  return ast.nodes.map((node, index) => {
    const key = node.label.toUpperCase().replace(/\s+/g, '-')
    const incoming = ast.edges.filter((edge) => edge.to === node.id)
    const outgoing = ast.edges.filter((edge) => edge.from === node.id)
    const op = opcodes[key] || 'OP_UNKNOWN'
    const abjad = ABJAD_WEIGHT[op] ?? 0
    // Spectrum position: 0 = NIL (910), 1 = QUBIT (518), approaching 0 = collapsed
    // Normalized: 0.0 = OP_UNKNOWN (vacuum), 1.0 = OP_NIL (inverted maximum)
    const spectrumPos = abjad / 910
    return {
      index,
      op,
      abjad,
      spectrumPos,
      label: node.label,
      type: node.type,
      row: node.row,
      col: node.col,
      flags: {
        quantum_seeded:    incoming.some((edge) => edge.type === 'QUANTUM'),
        rtl_reversed:      incoming.some((edge) => edge.type === 'BACKWARD'),
        ada_gated_out:     outgoing.some((edge) => edge.type === 'GATE' || edge.type === 'V-GATE'),
        lean4_required:    node.type === 'VERIFY',
        contract_bound:    node.type === 'CONTRACT',
        planner_reactive:  node.type === 'PLANNER',
        nil_ground:        op === 'OP_NIL',
        qubit_superposed:  op === 'OP_QUBIT',
      },
      source_hash: spatialHash
    }
  })
}

async function render() {
  const ast = parse(source.value)
  const spatialHash = await sha256(source.value)
  if (!cleanHash) cleanHash = spatialHash
  const instructions = compile(ast, spatialHash)
  const envelopeHash = await sha256(spatialHash + JSON.stringify(instructions.map((item) => item.op + item.label)))
  currentManifest = { spatialHash, envelopeHash, dims: ast.dims, nodes: ast.nodes, edges: ast.edges, instructions, source: source.value }

  hashNode.textContent = spatialHash
  envelopeNode.textContent = envelopeHash
  dimsNode.textContent = `${ast.dims.rows} rows × ${ast.dims.cols} cols`
  corruptionNode.textContent = spatialHash === cleanHash ? 'clean' : `changed: ${cleanHash.slice(0, 16)}… → ${spatialHash.slice(0, 16)}…`
  artNode.innerHTML = renderSvg(ast, spatialHash)
  compiledNode.textContent = instructions.map((item) => {
    const flags = Object.entries(item.flags).filter(([, value]) => value).map(([key]) => key).join(', ')
    const bar = spectrumBar(item.spectrumPos)
    return `${String(item.index).padStart(2, '0')} ${item.op.padEnd(22)} ${bar} abjad:${String(item.abjad).padStart(4)}  "${item.label}"${flags ? `\n   [${flags}]` : ''}`
  }).join('\n')
  renderSpectrum(instructions)
  traceNode.textContent = [
    `TESSERA PARSE — spatial hash: ${spatialHash.slice(0, 16)}…`,
    `dims: ${ast.dims.rows}r × ${ast.dims.cols}c`,
    '',
    'NODES:',
    ...ast.nodes.map((node) => `  [${node.type.padEnd(8)}] "${node.label}" @ row ${node.row}, col ${node.col}`),
    '',
    'EDGES:',
    ...ast.edges.map((edge) => `  ${edge.type.padEnd(9)} ${edge.from.split('@')[0]} → ${edge.to.split('@')[0]}`)
  ].join('\n')
}

function renderSvg(ast, spatialHash) {
  const cellW = 10
  const rowH = 34
  const width = Math.max(720, ast.dims.cols * cellW + 80)
  const height = Math.max(360, ast.dims.rows * rowH + 90)
  const byId = new Map(ast.nodes.map((node) => [node.id, node]))
  const center = (node) => ({
    x: 40 + ((node.col + node.endCol) / 2) * cellW,
    y: 45 + node.row * rowH
  })
  const defs = `
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#00ff88"/></marker>
      <marker id="arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#f97316"/></marker>
      <marker id="arrow-purple" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#7c3aed"/></marker>
    </defs>`
  const edges = ast.edges.map((edge) => {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (!from || !to) return ''
    const a = center(from)
    const b = center(to)
    return `<path class="edge ${edge.type}" d="M ${a.x} ${a.y} L ${b.x} ${b.y}"/>`
  }).join('\n')
  const nodes = ast.nodes.map((node) => {
    const p = center(node)
    const w = Math.max(92, (node.endCol - node.col + 3) * cellW)
    const key = node.label.toUpperCase().replace(/\s+/g, '-')
    const op = opcodes[key] || 'OP_UNKNOWN'
    const badge = op === 'OP_NIL' ? ' ·NIL·' : op === 'OP_QUBIT' ? ' ·Q·' : ''
    return `<g class="node ${node.type.toLowerCase()} op-${op.toLowerCase().replace(/_/g,'-')}"><rect x="${p.x - w / 2}" y="${p.y - 18}" width="${w}" height="36"/><text x="${p.x}" y="${p.y - 1}">${escapeXml(node.label)}${badge}</text></g>`
  }).join('\n')
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${defs}<rect width="${width}" height="${height}" fill="#05060a"/><text x="24" y="26" fill="#aab4c4" font-family="monospace" font-size="13">spatial hash ${spatialHash.slice(0, 24)}...</text>${edges}${nodes}</svg>`
}

function spectrumBar(pos) {
  const width = 12
  const filled = Math.round(pos * width)
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  return `[${bar}]`
}

function renderSpectrum(instructions) {
  const el = document.getElementById('spectrum-panel')
  if (!instructions.length) { el.innerHTML = ''; return }
  const sorted = [...instructions].sort((a, b) => b.abjad - a.abjad)
  const rows = sorted.map((item) => {
    const pct = Math.round(item.spectrumPos * 100)
    const color = item.op === 'OP_NIL'   ? '#f97316'
                : item.op === 'OP_QUBIT' ? '#7c3aed'
                : item.op === 'OP_QUANTUM' || item.op.startsWith('OP_PLANNER') ? '#8bd4ff'
                : item.abjad >= 200      ? '#00ff88'
                : '#aab4c4'
    return `<div class="sp-row">
      <span class="sp-label" style="color:${color}">${item.op}</span>
      <div class="sp-bar-wrap"><div class="sp-bar" style="width:${pct}%;background:${color}"></div></div>
      <span class="sp-val">${item.abjad}</span>
      <span class="sp-name">${item.label}</span>
    </div>`
  }).join('')
  el.innerHTML = `
    <div class="sp-axis">
      <span style="color:#f97316">NIL 910 ←</span>
      <span style="color:#7c3aed">QUBIT 518</span>
      <span style="color:#aab4c4">→ CLASSICAL 90</span>
      <span style="color:#333">→ VACUUM 0</span>
    </div>
    ${rows}`
}

function corruptOneChar() {
  source.value = source.value.includes('PUSH-DATA')
    ? source.value.replace('PUSH-DATA', 'PUSH_DATA')
    : source.value.replace(/[A-Z]/, (letter) => letter === 'X' ? 'Y' : 'X')
  render()
}

function download(name, body, type) {
  const blob = new Blob([body], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function escapeXml(value) {
  return value.replace(/[<>&"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char]))
}

async function forge() {
  const message = document.getElementById('forge-message').value || 'THE ART IS THE SEAL'
  const cipher = document.getElementById('cipher').value
  const key = document.getElementById('cipher-key').value || 'SNAPKITTY'
  const esolang = generateEsolang(currentEsolang, message)
  const sourceHash = await sha256(esolang.source)
  const encrypted = applyCipher(esolang.source, cipher, key, { language: esolang.name, message, sourceHash })
  const cipherHash = await sha256(encrypted)
  const fusedHash = await sha256(`${currentEsolang}|${message}|${cipher}|${key}|${sourceHash}|${cipherHash}`)
  const tessera = wrapEsolangAsTessera(esolang, fusedHash)
  currentForge = { language: currentEsolang, message, cipher, key, esolang, encrypted, sourceHash, cipherHash, fusedHash, tessera }
  esolangSourceNode.textContent = esolang.source
  cipherOutputNode.textContent = [
    `LANGUAGE: ${esolang.name}`,
    `CIPHER: ${cipher}`,
    `SOURCE_HASH: ${sourceHash}`,
    `CIPHER_HASH: ${cipherHash}`,
    `FUSED_GLOW_SEAL: ${fusedHash}`,
    `MAGMA_GLYPHS: ${magmaGlyphs.join('')}`,
    '',
    encrypted
  ].join('\n')
  glowSealNode.innerHTML = renderGlowSeal(currentForge)
}

function generateEsolang(language, message) {
  const clean = message.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim() || 'SEAL'
  const chars = [...clean]
  if (language === 'brainfuck') {
    let pointer = 0
    const cells = chars.map((char) => char.charCodeAt(0))
    const source = cells.map((code, index) => {
      const pluses = '+'.repeat(Math.max(1, Math.floor(code / 8)))
      const rem = '+'.repeat(code % 8)
      const move = index === 0 ? '' : '>'
      pointer += 1
      return `${move}${pluses}[>++++++++<-]>${rem}.`
    }).join('\n')
    return { name: 'Brainfuck', source, visualToken: '><+-[].,' }
  }
  if (language === 'malbolge') {
    const alphabet = "('&%:9]!~}|z2Vxwv-,POqponl$Hjig%eB@@>}<M:9wv6WsU2T|nm-,jcL(I&%$#\"`CB]V?Tx<uVtT`Rpo3NlF.Jh++FdbCBA@?>=<;:9876543s+O<oLm"
    const source = chars.map((char, index) => alphabet[(char.charCodeAt(0) + index * 13) % alphabet.length]).join('')
    return { name: 'Malbolge', source: chunk(source, 60).join('\n'), visualToken: 'chaos' }
  }
  if (language === 'shakespeare') {
    const words = chars.filter((char) => char !== ' ')
    const source = [
      'The Seal of Sovereign Art.',
      '',
      'Romeo, a brave agent.',
      'Juliet, a luminous verifier.',
      '',
      'Act I: The glyph awakens.',
      'Scene I: The WORM remembers.',
      '',
      ...words.map((char, index) => `Romeo: You are as ${index % 2 ? 'radiant' : 'honest'} as ${char.charCodeAt(0)} suns.`),
      'Juliet: Open your heart.'
    ].join('\n')
    return { name: 'Shakespeare', source, visualToken: 'stage' }
  }
  if (language === 'chef') {
    const source = [
      'Glowing Hash Seal.',
      '',
      'Ingredients.',
      ...chars.map((char) => `${char.charCodeAt(0)} g ${char === ' ' ? 'space' : char}`),
      '',
      'Method.',
      'Fold glyphs into the mixing bowl.',
      'Encrypt until luminous.',
      'Seal with WORM.',
      '',
      'Serves one sovereign runtime.'
    ].join('\n')
    return { name: 'Chef', source, visualToken: 'recipe' }
  }
  if (language === 'lolcat') {
    const source = [
      'HAI 1.2',
      'I HAS A SEAL ITZ "WORM"',
      ...chars.map((char, index) => `VISIBLE "${index}:${char === ' ' ? 'SPACE' : char}"`),
      'VISIBLE "ART IZ PROGRAM"',
      'KTHXBYE'
    ].join('\n')
    return { name: 'Cat Code / LOLCODE', source, visualToken: 'cat' }
  }
  if (language === 'befunge') {
    const line = `"${clean}"v`
    const source = [
      line,
      '>' + chars.map(() => ':').join('') + 'v',
      '^' + chars.map(() => '.').join('') + '@'
    ].join('\n')
    return { name: 'Befunge', source, visualToken: '2d' }
  }
  const source = chars.map((char) => {
    const bits = char.charCodeAt(0).toString(2).padStart(8, '0')
    return bits.replace(/0/g, ' ').replace(/1/g, '\t')
  }).join('\n')
  return { name: 'Whitespace', source, visualToken: 'invisible' }
}

function applyCipher(text, cipher, key, meta = {}) {
  if (cipher === 'reverse') return [...text].reverse().join('')
  if (cipher === 'unicode') return toUnicodeCodepoints(text)
  if (cipher === 'reverse_unicode') return toReverseUnicode(text)
  if (cipher === 'magma') return toMagmaSeal(text, key, meta)
  if (cipher === 'macro_strings') return toMacroStrings(text, key, meta)
  if (cipher === 'emoji_code') return toEmojiCode(text, key, meta)
  if (cipher === 'xor') {
    const bytes = [...text].map((char, index) => char.charCodeAt(0) ^ key.charCodeAt(index % key.length))
    return chunk(bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(''), 64).join('\n')
  }
  if (cipher === 'vigenere') {
    return [...text].map((char, index) => shiftChar(char, key.charCodeAt(index % key.length) % 26)).join('')
  }
  const amount = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 26
  return [...text].map((char) => shiftChar(char, amount)).join('')
}

function toUnicodeCodepoints(text) {
  return [...text].map((char) => {
    const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
    return `U+${code}`
  }).join(' ')
}

function toReverseUnicode(text) {
  return [...text].reverse().map((char) => {
    const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
    return `${char === '\n' ? '↵' : char}⟦U+${code}⟧`
  }).join(' ')
}

function toMagmaSeal(text, key, meta) {
  const unicode = toUnicodeCodepoints(text)
  const reverseUnicode = toReverseUnicode(text)
  const glyphLine = magmaGlyphs.join('')
  return [
    '╔════════════════ MAGMA SEAL ════════════════╗',
    `║ GLYPHS        ${glyphLine}`,
    `║ LANGUAGE      ${meta.language || 'unknown'}`,
    `║ MESSAGE       ${meta.message || 'sealed art'}`,
    `║ KEY           ${key}`,
    `║ SOURCE_HASH   ${meta.sourceHash || 'pending'}`,
    '╠════════════ FORWARD UNICODE ═══════════════╣',
    unicode,
    '╠════════════ REVERSE UNICODE ═══════════════╣',
    reverseUnicode,
    '╠════════════ ORIGINAL SOURCE ═══════════════╣',
    text,
    '╚════════════════════════════════════════════╝'
  ].join('\n')
}

function toMacroStrings(text, key, meta) {
  const macroName = (meta.language || 'ESOLANG').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  const lines = text.split('\n')
  const body = lines.map((line, index) => {
    const escaped = line.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return `@${macroName}_LINE_${String(index).padStart(2, '0')}("${escaped}")`
  }).join('\n')
  return [
    `@MAGMA_BEGIN("${macroName}", key="${key}")`,
    '@MACRO_GLYPHS("🧠⚡🪨🔗🎯🛡️🔍")',
    `@SOURCE_HASH("${meta.sourceHash || 'pending'}")`,
    body,
    `@MAGMA_END("${macroName}")`
  ].join('\n')
}

function toEmojiCode(text, key, meta) {
  const keyed = [...key].reduce((sum, char) => sum + char.codePointAt(0), 0)
  const encoded = [...text].map((char, index) => {
    const code = char.codePointAt(0)
    const left = emojiOpcodes[(code + keyed + index) % emojiOpcodes.length]
    const right = emojiOpcodes[(code + index * 7) % emojiOpcodes.length]
    return `${left}${right}${code.toString(16).toUpperCase().padStart(4, '0')}`
  })
  return [
    `🧠 EMOJI_CODE: ${meta.language || 'unknown'}`,
    `🔗 KEY: ${key}`,
    `🪨 SOURCE_HASH: ${meta.sourceHash || 'pending'}`,
    `⚡ STREAM:`,
    chunk(encoded.join(' '), 74).join('\n')
  ].join('\n')
}

function shiftChar(char, amount) {
  const code = char.charCodeAt(0)
  if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + amount) % 26) + 65)
  if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + amount) % 26) + 97)
  return char
}

function wrapEsolangAsTessera(forgeResult, fusedHash) {
  const label = forgeResult.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `
[ ${label} ] ----(->)---- [ CIPHER-${forgeResult.visualToken.toUpperCase()} ]
      |                              |
     (==)                           (==)
      |                              |
< MAGMA-${fusedHash.slice(0, 8).toUpperCase()} > -----> | WORM-SEAL |
`.trim()
}

function renderGlowSeal(forgeResult) {
  const hash = forgeResult.fusedHash
  const rings = chunk(hash.slice(0, 48), 6)
  const glyphs = forgeResult.esolang.source.replace(/\s/g, '').slice(0, 80)
  const magma = magmaGlyphs.join('')
  const colors = ['#00ff88', '#f97316', '#7c3aed', '#8bd4ff']
  const ringSvg = rings.map((part, index) => {
    const radius = 44 + index * 18
    const color = colors[index % colors.length]
    const dash = (parseInt(part.slice(0, 2), 16) % 18) + 6
    return `<circle cx="180" cy="180" r="${radius}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${dash} ${dash / 2}" opacity="${0.9 - index * 0.08}"/>`
  }).join('')
  const glyphText = chunk(glyphs, 20).map((line, index) => {
    return `<text x="180" y="${150 + index * 18}" text-anchor="middle">${escapeXml(line)}</text>`
  }).join('')
  return `<svg viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg" class="glow-svg">
    <defs>
      <filter id="glow"><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="360" height="360" fill="#05060a"/>
    <g filter="url(#glow)">
      ${ringSvg}
      <path d="M180 42 L306 180 L180 318 L54 180 Z" fill="none" stroke="#00ff88" stroke-width="2"/>
      <text x="180" y="96" text-anchor="middle" class="seal-title">${escapeXml(forgeResult.esolang.name)}</text>
      <text x="180" y="122" text-anchor="middle" class="magma-line">${escapeXml(magma)}</text>
      ${glyphText}
      <text x="180" y="284" text-anchor="middle">${escapeXml(forgeResult.cipher.toUpperCase())} ${hash.slice(0, 20)}...</text>
    </g>
  </svg>`
}

function chunk(value, size) {
  const parts = []
  for (let i = 0; i < value.length; i += size) parts.push(value.slice(i, i + size))
  return parts
}
