const examples = {
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
  'BACKWARD-PATH': 'OP_SOVEREIGN'
}

const source = document.getElementById('source')
const hashNode = document.getElementById('hash')
const envelopeNode = document.getElementById('envelope')
const dimsNode = document.getElementById('dims')
const corruptionNode = document.getElementById('corruption')
const artNode = document.getElementById('art')
const compiledNode = document.getElementById('compiled')
const traceNode = document.getElementById('trace')
let cleanHash = ''
let currentManifest = null

source.value = examples.full
render()

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
    { open: '(', close: ')', type: 'BRIDGE' }
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
    return {
      index,
      op: opcodes[key] || 'OP_UNKNOWN',
      label: node.label,
      type: node.type,
      row: node.row,
      col: node.col,
      flags: {
        quantum_seeded: incoming.some((edge) => edge.type === 'QUANTUM'),
        rtl_reversed: incoming.some((edge) => edge.type === 'BACKWARD'),
        ada_gated_out: outgoing.some((edge) => edge.type === 'GATE' || edge.type === 'V-GATE'),
        lean4_required: node.type === 'VERIFY',
        contract_bound: node.type === 'CONTRACT'
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
    return `${String(item.index).padStart(2, '0')} ${item.op.padEnd(14)} "${item.label}"${flags ? `  [${flags}]` : ''}`
  }).join('\n')
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
    return `<g class="node ${node.type.toLowerCase()}"><rect x="${p.x - w / 2}" y="${p.y - 18}" width="${w}" height="36"/><text x="${p.x}" y="${p.y}">${escapeXml(node.label)}</text></g>`
  }).join('\n')
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${defs}<rect width="${width}" height="${height}" fill="#05060a"/><text x="24" y="26" fill="#aab4c4" font-family="monospace" font-size="13">spatial hash ${spatialHash.slice(0, 24)}...</text>${edges}${nodes}</svg>`
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

