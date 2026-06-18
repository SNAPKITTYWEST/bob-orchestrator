/**
 * Tessera — Spatial Syntax Parser
 *
 * A 2D programming language where the ASCII layout IS the logic.
 * Position defines relationship. Corrupt the logic, corrupt the art.
 *
 * Node types (bounding characters):
 *   [ LABEL ]   → CELL      — memory / computation node
 *   < LABEL >   → VERIFY    — Lean 4 verification node
 *   | LABEL |   → CONTRACT  — Ada contract boundary
 *   ( LABEL )   → BRIDGE    — FFI / external call
 *
 * Edge types (ASCII connectors):
 *   ---->        → FORWARD   — sequential execution
 *   <----        → BACKWARD  — feedback / reverse (49th Call)
 *   ====         → PARALLEL  — concurrent execution
 *   (->)         → GATE      — gated transition (Ada checked)
 *   ···>         → QUANTUM   — quantum-seeded path
 *
 * Vertical connectors:
 *   |            → DOWN      — vertical sequential
 *   ^            → UP        — vertical reverse
 *   (==)         → V-GATE    — vertical Ada gate
 *
 * Dee's Watchtower tablets used the same principle:
 *   12×13 letter grids where position determined meaning.
 *   Horizontal reading → divine names.
 *   Vertical reading   → different names.
 *   Diagonal reading   → sigils.
 * Tessera makes this executable.
 */

import { createHash } from 'crypto'

// ── Node type detection ────────────────────────────────────────────────────────

const NODE_PATTERNS = [
  { open: '[', close: ']', type: 'CELL'      },  // memory / compute
  { open: '<', close: '>', type: 'VERIFY'    },  // Lean 4 proof node
  { open: '|', close: '|', type: 'CONTRACT'  },  // Ada contract boundary
  { open: '(', close: ')', type: 'BRIDGE'    },  // FFI / external
]

// ── Edge detection ─────────────────────────────────────────────────────────────

const H_EDGES = [
  { pattern: /\(->?\)/,        type: 'GATE'     },  // (->)  — Ada gated
  { pattern: /·{3,}>/,         type: 'QUANTUM'  },  // ···>  — quantum path
  { pattern: /={3,}/,          type: 'PARALLEL' },  // ====  — parallel
  { pattern: /-{2,}>/,         type: 'FORWARD'  },  // --->  — sequential
  { pattern: /<-{2,}/,         type: 'BACKWARD' },  // <---  — reverse (49th)
]

const V_EDGES = [
  { pattern: /\(==\)/,         type: 'V-GATE'   },  // (==)  — vertical Ada gate
  { pattern: /\^/,             type: 'UP'       },  // ^     — upward
  { pattern: /\|/,             type: 'DOWN'     },  // |     — downward
]

// ── Parser ────────────────────────────────────────────────────────────────────

export function parse(source) {
  const lines = source.split('\n')
  const grid  = lines.map(l => l.split(''))

  const nodes = []
  const edges = []
  const nodeMap = new Map()  // "row,col" → node id

  // ── Pass 1: detect nodes ──────────────────────────────────────────────────
  lines.forEach((line, row) => {
    for (const { open, close, type } of NODE_PATTERNS) {
      // Avoid double-counting '|' as both open and close
      let col = 0
      while (col < line.length) {
        const oi = line.indexOf(open, col)
        if (oi < 0) break
        const ci = line.indexOf(close, oi + 1)
        if (ci < 0) break

        const label = line.slice(oi + 1, ci).trim()
        if (label.length === 0) { col = oi + 1; continue }

        // Skip if it's a vertical edge token (==) or vertical |
        if (type === 'CONTRACT' && (line.slice(oi, ci+1).trim() === '|')) { col = ci + 1; continue }

        const id = `${label}@${row},${oi}`
        const node = { id, label, type, row, col: oi, endCol: ci }
        nodes.push(node)

        // Register all columns spanned for edge-to-node lookup
        for (let c = oi; c <= ci; c++) {
          nodeMap.set(`${row},${c}`, node)
        }

        col = ci + 1
      }
    }
  })

  // ── Pass 2: detect horizontal edges ──────────────────────────────────────
  lines.forEach((line, row) => {
    for (const { pattern, type } of H_EDGES) {
      const re = new RegExp(pattern.source, 'g')
      let m
      while ((m = re.exec(line)) !== null) {
        const edgeStart = m.index
        const edgeEnd   = m.index + m[0].length - 1

        // Find left and right neighbour nodes on this row
        let leftNode  = null
        let rightNode = null

        for (let c = edgeStart - 1; c >= 0; c--) {
          const n = nodeMap.get(`${row},${c}`)
          if (n) { leftNode = n; break }
        }
        for (let c = edgeEnd + 1; c < line.length; c++) {
          const n = nodeMap.get(`${row},${c}`)
          if (n) { rightNode = n; break }
        }

        if (leftNode && rightNode) {
          edges.push({
            from:    leftNode.id,
            to:      rightNode.id,
            type,
            axis:    'H',
            row,
            col:     edgeStart,
            pattern: m[0],
          })
        }
      }
    }
  })

  // ── Pass 3: detect vertical edges ────────────────────────────────────────
  // For each column, scan down for vertical connectors
  const maxCols = Math.max(...lines.map(l => l.length))
  for (let col = 0; col < maxCols; col++) {
    for (let row = 0; row < lines.length; row++) {
      const char = (lines[row] || '')[col] || ''

      for (const { pattern, type } of V_EDGES) {
        // Check (==) spanning multiple cols
        if (type === 'V-GATE') {
          const seg = (lines[row] || '').slice(col, col + 5)
          if (/^\(==\)/.test(seg)) {
            let topNode = null, bottomNode = null
            for (let r = row - 1; r >= 0; r--) {
              const n = nodeMap.get(`${r},${col}`) || nodeMap.get(`${r},${col+1}`) || nodeMap.get(`${r},${col+2}`)
              if (n) { topNode = n; break }
            }
            for (let r = row + 1; r < lines.length; r++) {
              const n = nodeMap.get(`${r},${col}`) || nodeMap.get(`${r},${col+1}`) || nodeMap.get(`${r},${col+2}`)
              if (n) { bottomNode = n; break }
            }
            if (topNode && bottomNode) {
              edges.push({ from: topNode.id, to: bottomNode.id, type: 'V-GATE', axis: 'V', row, col })
            }
          }
          continue
        }

        // Single-char vertical edges
        if (pattern.test(char)) {
          let topNode = null, bottomNode = null
          for (let r = row - 1; r >= 0; r--) {
            const n = nodeMap.get(`${r},${col}`)
            if (n) { topNode = n; break }
            if ((lines[r] || '')[col] && !/[|^]/.test((lines[r] || '')[col])) break
          }
          for (let r = row + 1; r < lines.length; r++) {
            const n = nodeMap.get(`${r},${col}`)
            if (n) { bottomNode = n; break }
            if ((lines[r] || '')[col] && !/[|^]/.test((lines[r] || '')[col])) break
          }
          if (topNode && bottomNode) {
            edges.push({
              from: type === 'UP' ? bottomNode.id : topNode.id,
              to:   type === 'UP' ? topNode.id    : bottomNode.id,
              type,
              axis: 'V',
              row, col,
            })
          }
        }
      }
    }
  }

  // ── Spatial hash — the art IS the seal ───────────────────────────────────
  // SHA-256 of the ASCII source. If you change the layout, the hash changes.
  // The visual IS the program identity.
  const spatialHash = createHash('sha256').update(source).digest('hex')

  return {
    source,
    nodes,
    edges,
    spatialHash,
    dims: { rows: lines.length, cols: maxCols },
    // Topology summary — readable at a glance
    topology: {
      cellCount:      nodes.filter(n => n.type === 'CELL').length,
      verifyCount:    nodes.filter(n => n.type === 'VERIFY').length,
      contractCount:  nodes.filter(n => n.type === 'CONTRACT').length,
      bridgeCount:    nodes.filter(n => n.type === 'BRIDGE').length,
      gatedEdges:     edges.filter(e => e.type === 'GATE' || e.type === 'V-GATE').length,
      quantumEdges:   edges.filter(e => e.type === 'QUANTUM').length,
      forwardEdges:   edges.filter(e => e.type === 'FORWARD').length,
      backwardEdges:  edges.filter(e => e.type === 'BACKWARD').length,
    }
  }
}

// ── Pretty print AST for debugging ───────────────────────────────────────────

export function printAST(ast) {
  const lines = [
    `TESSERA PARSE — spatial hash: ${ast.spatialHash.slice(0, 16)}…`,
    `dims: ${ast.dims.rows}r × ${ast.dims.cols}c`,
    '',
    'NODES:',
    ...ast.nodes.map(n =>
      `  [${n.type.padEnd(10)}] "${n.label}" @ row ${n.row}, col ${n.col}`
    ),
    '',
    'EDGES:',
    ...ast.edges.map(e =>
      `  ${e.type.padEnd(10)} ${e.from.split('@')[0].padEnd(20)} → ${e.to.split('@')[0]}`
    ),
    '',
    'TOPOLOGY:',
    ...Object.entries(ast.topology).map(([k, v]) => `  ${k}: ${v}`),
  ]
  return lines.join('\n')
}
