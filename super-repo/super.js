const opcodes = {
  OP_PR_CONTEXT: '0x01',
  OP_RTL_DELTA: '0x10',
  OP_REGMAP_DELTA: '0x11',
  OP_MODEL_CONTEXT: '0x12',
  OP_ROUTE_APP: '0x20',
  OP_EDA_SIM: '0x30',
  OP_FORMAL: '0x31',
  OP_SYNTH: '0x32',
  OP_DRIVER_CHECK: '0x33',
  OP_WORM_RECEIPT: '0xF0',
  OP_PAGES_REPORT: '0xF1'
}

const flows = {
  rtl: ['OP_PR_CONTEXT', 'OP_RTL_DELTA', 'OP_ROUTE_APP', 'OP_EDA_SIM', 'OP_FORMAL', 'OP_WORM_RECEIPT', 'OP_PAGES_REPORT'],
  driver: ['OP_PR_CONTEXT', 'OP_REGMAP_DELTA', 'OP_ROUTE_APP', 'OP_DRIVER_CHECK', 'OP_WORM_RECEIPT', 'OP_PAGES_REPORT'],
  model: ['OP_PR_CONTEXT', 'OP_MODEL_CONTEXT', 'OP_ROUTE_APP', 'OP_EDA_SIM', 'OP_SYNTH', 'OP_WORM_RECEIPT']
}

const apps = [
  {
    model: 'nemotron',
    githubApp: 'snapkitty-nemotron-eda',
    permissions: ['pull_requests:read', 'checks:write', 'contents:read'],
    backend: 'ephemeral-eda-worker/nemotron',
    routes: ['rtl', 'formal', 'synthesis']
  },
  {
    model: 'mistral',
    githubApp: 'snapkitty-mistral-review',
    permissions: ['pull_requests:read', 'checks:write'],
    backend: 'ephemeral-eda-worker/review',
    routes: ['lint', 'driver-map', 'docs']
  },
  {
    model: 'dboib',
    githubApp: 'snapkitty-dboib-meta-agent',
    permissions: ['metadata:read', 'checks:write'],
    backend: 'router/control-plane',
    routes: ['dependency-graph', 'minimal-verification', 'worm-receipt']
  }
]

document.getElementById('compile').addEventListener('click', compile)
document.getElementById('flow').addEventListener('change', compile)
document.getElementById('route').addEventListener('click', route)

compile()
route()
renderGraph()

async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function compile() {
  const flow = document.getElementById('flow').value
  const ops = flows[flow]
  const bytes = ops.map((op) => opcodes[op])
  const bytecode = bytes.join(' ')
  const seal = await sha256(`${flow}|${bytecode}`)
  document.getElementById('bytecode').textContent = [
    `FLOW        ${flow}`,
    `BYTECODE    ${bytecode}`,
    `SEAL        ${seal}`,
    '',
    ...ops.map((op, index) => `${String(index).padStart(2, '0')} ${op.padEnd(18)} ${opcodes[op]}`)
  ].join('\n')
}

async function route() {
  const payload = {
    event: 'pull_request.opened',
    repo: 'SNAPKITTYWEST/inverted-mono-super-repo',
    changed: ['rtl/core/ape_bus.sv', 'drivers/ape_bus.rs', 'models/nemotron/context.json'],
    dependencyInversion: true,
    lfs: ['waveforms/*.vcd', 'bitstreams/*.bin', 'netlists/*.json']
  }
  const routed = apps.map((app) => ({
    ...app,
    selected: app.model === 'dboib' || app.routes.some((routeName) => JSON.stringify(payload.changed).includes(routeName)) || app.model === 'nemotron'
  }))
  const receipt = await sha256(JSON.stringify({ payload, routed }))
  document.getElementById('apps').textContent = JSON.stringify({ payload, routed, wormReceipt: receipt }, null, 2)
}

function renderGraph() {
  const nodes = [
    ['PR Event', 90, 80, 'app'],
    ['DBOIB Meta Agent', 300, 80, 'model'],
    ['Abstract RTL Interfaces', 540, 80, ''],
    ['EDA Worker', 780, 80, 'eda'],
    ['Checks API', 990, 80, 'app'],
    ['Git LFS Artifacts', 300, 220, 'eda'],
    ['Binary Bytecode', 540, 220, ''],
    ['WORM Receipt', 780, 220, 'model'],
    ['GitHub Pages Report', 990, 220, 'app']
  ]
  const edges = [
    [0, 1, 'control'],
    [1, 2, 'proof'],
    [2, 3, 'control'],
    [3, 4, 'control'],
    [1, 5, 'proof'],
    [1, 6, 'control'],
    [6, 7, 'proof'],
    [7, 8, 'control']
  ]
  const nodeSvg = nodes.map(([label, x, y, klass]) => {
    return `<g class="node ${klass}"><rect x="${x - 80}" y="${y - 28}" width="160" height="56"/><text x="${x}" y="${y}">${label}</text></g>`
  }).join('')
  const edgeSvg = edges.map(([a, b, klass]) => {
    const from = nodes[a]
    const to = nodes[b]
    return `<path class="edge ${klass}" d="M ${from[1] + 82} ${from[2]} L ${to[1] - 82} ${to[2]}"/>`
  }).join('')
  document.getElementById('graph').innerHTML = `<svg viewBox="0 0 1120 310" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#00ff88"/></marker></defs>
    <rect width="1120" height="310" fill="#05060a"/>
    ${edgeSvg}
    ${nodeSvg}
  </svg>`
}

