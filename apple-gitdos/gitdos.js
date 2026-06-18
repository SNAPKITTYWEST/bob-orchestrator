const terminal = document.getElementById('terminal')
const form = document.getElementById('command-form')
const input = document.getElementById('command')
const sealNode = document.getElementById('worm-seal')
const modelNode = document.getElementById('model-name')
const bootButton = document.getElementById('boot')

const state = {
  model: localStorage.getItem('gitdos-model') || 'nemotron',
  endpoint: localStorage.getItem('gitdos-endpoint') || 'http://127.0.0.1:11434',
  worm: JSON.parse(localStorage.getItem('gitdos-worm') || '[]'),
  transcript: []
}

modelNode.textContent = state.model
sealNode.textContent = state.worm.at(-1)?.seal?.slice(0, 16) || 'GENESIS'

const bootText = [
  'APPLE GITDOS BY SNAPKITTY OS',
  'A.P.E. COMPUTER DEMO ROM 0.1',
  'COPYRIGHT SNAPKITTY COLLECTIVE 2026',
  '',
  'DOS READY.',
  'TYPE HELP FOR COMMANDS.',
  ''
]

boot()

bootButton.addEventListener('click', boot)
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const command = input.value.trim()
  if (!command) return
  input.value = ''
  print(`] ${command}`)
  await run(command)
})

function boot() {
  terminal.textContent = ''
  bootText.forEach((line) => print(line, 'system'))
  input.focus()
}

function print(text = '', kind = '') {
  const line = document.createElement('div')
  line.className = `line ${kind}`.trim()
  line.textContent = text
  terminal.appendChild(line)
  terminal.scrollTop = terminal.scrollHeight
  state.transcript.push({ kind, text, ts: new Date().toISOString() })
}

function appendToLast(text) {
  const last = terminal.lastElementChild || terminal.appendChild(document.createElement('div'))
  last.textContent += text
  terminal.scrollTop = terminal.scrollHeight
}

async function run(raw) {
  const [head, ...rest] = raw.split(/\s+/)
  const command = head.toUpperCase()
  const args = rest.join(' ')

  if (command === 'HELP') return help()
  if (command === 'CATALOG') return catalog()
  if (command === 'HOME' || command === 'CLEAR') return boot()
  if (command === 'MODEL') return setModel(args)
  if (command === 'ENDPOINT') return setEndpoint(args)
  if (command === 'STATUS') return status()
  if (command === 'PR#WORM' || command === 'WORM') return showWorm()
  if (command === 'SEAL') return seal(args || state.transcript.map((item) => item.text).join('\n'))
  if (command === 'RUN' && args.toUpperCase() === 'TESSERA') return open('../tessera/studio.html', '_self')
  if (command === 'OPEN' && args.toUpperCase() === 'TESSERA') return open('../tessera/studio.html', '_self')
  if (command === 'RUN' && args.toUpperCase() === 'SUPERREPO') return open('../super-repo/', '_self')
  if (command === 'OPEN' && args.toUpperCase() === 'SUPERREPO') return open('../super-repo/', '_self')
  if (command === 'SAVE') return saveTranscript()
  if (command === 'GIT') return git(args)
  if (command === 'ASK' || command === 'CHAT' || command === 'BRUN') return ask(args)

  return ask(raw)
}

function help() {
  print('COMMANDS:', 'system')
  print('  CATALOG              LIST TOOLS')
  print('  ASK <PROMPT>         CHAT WITH LOCAL OLLAMA MODEL')
  print('  CHAT <PROMPT>        SAME AS ASK')
  print('  BRUN <PROMPT>        RUN MODEL LIKE A DOS BINARY')
  print('  MODEL <TAG>          SET OLLAMA MODEL TAG')
  print('  ENDPOINT <URL>       SET OLLAMA ENDPOINT')
  print('  STATUS               CHECK LOCAL OLLAMA')
  print('  RUN TESSERA          OPEN TESSERA STUDIO')
  print('  RUN SUPERREPO        OPEN INVERTED MONO SUPER REPO')
  print('  SEAL <TEXT>          WORM-SEAL TEXT')
  print('  PR#WORM              SHOW WORM CHAIN')
  print('  GIT STATUS           SHOW DEMO REPO STATE')
  print('  SAVE                 DOWNLOAD TRANSCRIPT JSON')
  print('  HOME                 CLEAR SCREEN')
}

function catalog() {
  print('DISK VOLUME 254', 'system')
  for (const item of [
    'A 002 GITDOS.SYSTEM',
    'B 004 OLLAMA.BRUN',
    'B 003 TESSERA.STUDIO',
    'B 006 SUPERREPO.BIN',
    'T 002 WORM.SEAL',
    'T 001 ADA.CONTRACT',
    'T 001 LEAN4.PROOF',
    'T 001 SNAPOS.README'
  ]) print(item)
}

function setModel(value) {
  if (!value) {
    print(`MODEL IS ${state.model}`, 'system')
    return
  }
  state.model = value
  localStorage.setItem('gitdos-model', value)
  modelNode.textContent = value
  print(`MODEL SET TO ${value}`, 'system')
}

function setEndpoint(value) {
  if (!value) {
    print(`ENDPOINT IS ${state.endpoint}`, 'system')
    return
  }
  state.endpoint = value.replace(/\/$/, '')
  localStorage.setItem('gitdos-endpoint', state.endpoint)
  print(`ENDPOINT SET TO ${state.endpoint}`, 'system')
}

async function status() {
  try {
    const response = await fetch(`${state.endpoint}/api/tags`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    print(`OLLAMA ONLINE: ${(data.models || []).map((model) => model.name).join(', ') || 'NO MODELS'}`, 'system')
  } catch (error) {
    print(`OLLAMA OFFLINE: ${error.message}`, 'error')
  }
}

async function ask(prompt) {
  if (!prompt) {
    print('SYNTAX: ASK <PROMPT>', 'error')
    return
  }
  const start = await appendWorm('CHAT_START', { model: state.model, promptHash: await sha256(prompt) })
  print(`RUNNING ${state.model} / SEAL ${start.seal.slice(0, 16)}...`, 'seal')
  print('', 'ai')
  try {
    const response = await fetch(`${state.endpoint}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({ model: state.model, prompt, stream: true })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    let doneSeen = false
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        const chunk = JSON.parse(line)
        if (chunk.response) {
          full += chunk.response
          appendToLast(chunk.response)
        }
        if (chunk.done === true) doneSeen = true
      }
    }
    const final = await appendWorm('CHAT_DONE', { model: state.model, responseHash: await sha256(full), doneSeen })
    print(`\nWORM SEALED ${final.seal}`, 'seal')
  } catch (error) {
    const fail = await appendWorm('CHAT_ERROR', { model: state.model, reason: error.message })
    print(`I/O ERROR: ${error.message}`, 'error')
    print(`WORM SEALED ${fail.seal}`, 'seal')
  }
}

async function seal(text) {
  const event = await appendWorm('MANUAL_SEAL', { textHash: await sha256(text), text })
  print(`SEALED ${event.seal}`, 'seal')
}

function showWorm() {
  print('WORM CHAIN:', 'system')
  state.worm.slice(-12).forEach((event) => {
    print(`${String(event.tick).padStart(3, '0')} ${event.type.padEnd(12)} ${event.seal}`)
  })
}

function git(args) {
  const sub = args.toUpperCase()
  if (sub === 'STATUS') {
    print('ON BRANCH GH-PAGES-ROM', 'system')
    print('WORKTREE CLEAN')
    print('REMOTE: SNAPKITTYWEST/bob-orchestrator')
    return
  }
  if (sub === 'LOG') {
    print('5991B5B FREEZE TESSERA STUDIO FOR GITHUB PAGES')
    print('31FF1E1 ADD MAGMA UNICODE MACRO AND EMOJI SEAL LAYERS')
    return
  }
  print('GIT COMMANDS: STATUS, LOG')
}

function saveTranscript() {
  const body = JSON.stringify({ transcript: state.transcript, worm: state.worm }, null, 2)
  const blob = new Blob([body], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'apple-gitdos-transcript.json'
  link.click()
  URL.revokeObjectURL(url)
}

async function appendWorm(type, payload) {
  const parentSeal = state.worm.at(-1)?.seal || 'GENESIS'
  const event = {
    tick: state.worm.length,
    ts: new Date().toISOString(),
    type,
    parentSeal,
    payload
  }
  event.seal = await sha256(JSON.stringify(event))
  state.worm.push(event)
  localStorage.setItem('gitdos-worm', JSON.stringify(state.worm, null, 2))
  sealNode.textContent = event.seal.slice(0, 16)
  return event
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
