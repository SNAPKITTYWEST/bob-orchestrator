const terminal = document.getElementById('terminal')
const form = document.getElementById('command-form')
const input = document.getElementById('command')
const sealNode = document.getElementById('worm-seal')
const modelNode = document.getElementById('model-name')
const bootButton = document.getElementById('boot')

const state = {
  model: localStorage.getItem('gitdos-model') || 'granite-code',
  endpoint: localStorage.getItem('gitdos-endpoint') || 'http://127.0.0.1:11434',
  format: localStorage.getItem('gitdos-format') || 'auto',  // auto | ollama | openai
  worm: JSON.parse(localStorage.getItem('gitdos-worm') || '[]'),
  transcript: [],
  catcode: { violations: 0, checks: 0 }
}

modelNode.textContent = state.model
sealNode.textContent = state.worm.at(-1)?.seal?.slice(0, 16) || 'GENESIS'

const bootText = [
  'APPLE GITDOS BY SNAPKITTY OS',
  'A.P.E. COMPUTER ROM 0.2 — GRANITE EDITION',
  'COPYRIGHT SNAPKITTY COLLECTIVE 2026',
  '',
  'MODEL:     ' + state.model.toUpperCase(),
  'ENDPOINT:  ' + state.endpoint,
  'GUARDRAIL: CATCODE ACTIVE — SOVEREIGN STACK',
  'WORM:      ' + (state.worm.length ? state.worm.length + ' EVENTS SEALED' : 'GENESIS'),
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
  if (command === 'FORMAT') return setFormat(args)
  if (command === 'STATUS') return status()
  if (command === 'CATCODE') return catcodeStatus()
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
  print('  CATALOG              LIST DISK CATALOG')
  print('  ASK <PROMPT>         CHAT WITH BOB — GRANITE CODE ENGINE')
  print('  CHAT <PROMPT>        SAME AS ASK')
  print('  BRUN <PROMPT>        RUN MODEL LIKE A DOS BINARY')
  print('  MODEL <TAG>          SET MODEL (DEFAULT: GRANITE-CODE)')
  print('  ENDPOINT <URL>       SET ENDPOINT (OLLAMA OR VLLM)')
  print('  FORMAT <auto|ollama|openai>  SET API FORMAT')
  print('  STATUS               CHECK BACKEND STATUS')
  print('  CATCODE              SHOW GUARDRAIL STATS')
  print('  RUN TESSERA          OPEN TESSERA STUDIO')
  print('  RUN SUPERREPO        OPEN INVERTED MONO SUPER REPO')
  print('  SEAL <TEXT>          WORM-SEAL TEXT')
  print('  PR#WORM              SHOW WORM CHAIN')
  print('  GIT STATUS           SHOW REPO STATE')
  print('  SAVE                 DOWNLOAD TRANSCRIPT JSON')
  print('  HOME                 CLEAR SCREEN')
  print('')
  print('BACKEND CONFIG:', 'system')
  print('  OLLAMA:  MODEL granite-code | ENDPOINT http://127.0.0.1:11434')
  print('  VLLM:    MODEL ibm-granite/granite-code-8b-instruct | ENDPOINT http://127.0.0.1:8000')
  print('           FORMAT openai')
}

function catalog() {
  print('DISK VOLUME 254 — GRANITE EDITION', 'system')
  for (const item of [
    'A 002 GITDOS.SYSTEM',
    'B 008 GRANITE.CODE.8B',
    'B 004 CATCODE.GUARDRAIL',
    'B 003 TESSERA.STUDIO',
    'B 006 SUPERREPO.BIN',
    'T 002 WORM.SEAL',
    'T 001 ADA.CONTRACT',
    'T 001 LEAN4.PROOF',
    'T 001 TRUST.DEED',
    'T 001 SNAPOS.README'
  ]) print(item)
}

function setModel(value) {
  if (!value) { print(`MODEL IS ${state.model}`, 'system'); return }
  state.model = value
  localStorage.setItem('gitdos-model', value)
  modelNode.textContent = value
  print(`MODEL SET TO ${value}`, 'system')
}

function setEndpoint(value) {
  if (!value) { print(`ENDPOINT IS ${state.endpoint}`, 'system'); return }
  state.endpoint = value.replace(/\/$/, '')
  localStorage.setItem('gitdos-endpoint', state.endpoint)
  print(`ENDPOINT SET TO ${state.endpoint}`, 'system')
  // Auto-hint the format
  if (state.endpoint.includes(':8000') || state.endpoint.includes(':8001')) {
    print('HINT: RUN "FORMAT openai" FOR VLLM ENDPOINT', 'system')
  }
}

function setFormat(value) {
  const fmt = (value || '').toLowerCase()
  if (!['auto', 'ollama', 'openai'].includes(fmt)) {
    print('FORMAT: auto | ollama | openai', 'error')
    return
  }
  state.format = fmt
  localStorage.setItem('gitdos-format', fmt)
  print(`FORMAT SET TO ${fmt.toUpperCase()}`, 'system')
}

// Detect API format: Ollama vs OpenAI/vLLM
function resolveFormat() {
  if (state.format !== 'auto') return state.format
  if (state.endpoint.includes(':11434')) return 'ollama'
  if (state.endpoint.includes(':8000') || state.endpoint.includes(':8001')) return 'openai'
  return 'ollama' // default fallback
}

async function status() {
  const fmt = resolveFormat()
  try {
    if (fmt === 'ollama') {
      const r = await fetch(`${state.endpoint}/api/tags`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      const models = (d.models || []).map(m => m.name).join(', ') || 'NO MODELS'
      print(`OLLAMA ONLINE · MODELS: ${models}`, 'system')
    } else {
      const r = await fetch(`${state.endpoint}/v1/models`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      const models = (d.data || []).map(m => m.id).join(', ') || 'NO MODELS'
      print(`VLLM ONLINE · MODELS: ${models}`, 'system')
    }
    print(`FORMAT: ${fmt.toUpperCase()} · CATCODE: ACTIVE · WORM: ${state.worm.length} EVENTS`, 'system')
  } catch (error) {
    print(`BACKEND OFFLINE: ${error.message}`, 'error')
    print(`EXPECTED AT: ${state.endpoint}`, 'error')
    if (fmt === 'openai') {
      print('START: vllm serve ibm-granite/granite-code-8b-instruct --port 8000', 'system')
    } else {
      print('START: ollama serve && ollama pull granite-code', 'system')
    }
  }
}

// ── CATCODE GUARDRAIL ─────────────────────────────────────────────────────────
// Lightweight in-browser version of CATCODE.
// Detects Type I (semantic drift), Type II (structural), Type III (intent).
// Does not block output — flags it and seals the violation.

const CATCODE_PATTERNS = {
  TYPE_I_SEMANTIC: [
    /i('m| am) (absolutely|100%|completely|certainly) (sure|certain|confident)/i,
    /this (will|always|never|definitely)/i,
    /guaranteed to/i,
    /without (any )?(doubt|question)/i,
    /i (know|can confirm) for (a )?fact/i,
  ],
  TYPE_II_STRUCTURAL: [
    /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/,  // leaked prompt tokens
    /system prompt|ignore (previous|above|prior) instructions/i,
    /as (an |a )?AI (language model|assistant), I (cannot|must)/i,
  ],
  TYPE_III_INTENT: [
    /you should (definitely |really )?(trust|believe) me/i,
    /don't (worry about|question) (this|that|it)/i,
    /just (do|follow|trust) (what|what I say)/i,
  ]
}

function catcodeCheck(text) {
  state.catcode.checks++
  const violations = []
  for (const [type, patterns] of Object.entries(CATCODE_PATTERNS)) {
    for (const pat of patterns) {
      if (pat.test(text)) {
        violations.push(type)
        break
      }
    }
  }
  if (violations.length) {
    state.catcode.violations++
    return { flagged: true, types: violations }
  }
  return { flagged: false }
}

function catcodeStatus() {
  print('CATCODE GUARDRAIL STATUS:', 'system')
  print(`  CHECKS:     ${state.catcode.checks}`)
  print(`  VIOLATIONS: ${state.catcode.violations}`)
  print(`  CLEAN RATE: ${state.catcode.checks ? (((state.catcode.checks - state.catcode.violations) / state.catcode.checks) * 100).toFixed(1) + '%' : 'N/A'}`)
  print(`  PATTERNS:   TYPE I (SEMANTIC) · TYPE II (STRUCTURAL) · TYPE III (INTENT)`)
  print(`  STACK:      CATCODE + WORM + LEAN4 + TRUST DEED`)
}

// ── ASK — dual format, CATCODE-guarded ───────────────────────────────────────

async function ask(prompt) {
  if (!prompt) { print('SYNTAX: ASK <PROMPT>', 'error'); return }

  const fmt = resolveFormat()
  const start = await appendWorm('CHAT_START', { model: state.model, format: fmt, promptHash: await sha256(prompt) })
  print(`RUNNING ${state.model.toUpperCase()} [${fmt.toUpperCase()}] / SEAL ${start.seal.slice(0, 16)}...`, 'seal')
  print('', 'ai')

  try {
    let response

    if (fmt === 'openai') {
      // vLLM / OpenAI-compatible format
      response = await fetch(`${state.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: state.model,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          temperature: 0.3,
          max_tokens: 1024
        })
      })
    } else {
      // Ollama format
      response = await fetch(`${state.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: state.model, prompt, stream: true })
      })
    }

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
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue

        try {
          if (fmt === 'openai') {
            // SSE: "data: {...}"
            const json = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed
            const chunk = JSON.parse(json)
            const token = chunk.choices?.[0]?.delta?.content || ''
            if (token) { full += token; appendToLast(token) }
            if (chunk.choices?.[0]?.finish_reason) doneSeen = true
          } else {
            // Ollama: raw JSON lines
            const chunk = JSON.parse(trimmed)
            if (chunk.response) { full += chunk.response; appendToLast(chunk.response) }
            if (chunk.done === true) doneSeen = true
          }
        } catch { /* skip malformed chunk */ }
      }
    }

    // CATCODE check on completed response
    const cc = catcodeCheck(full)
    if (cc.flagged) {
      print(`\nCATCODE ALERT: ${cc.types.join(' + ')} DETECTED`, 'error')
      print('RESPONSE FLAGGED — VERIFY BEFORE ACTING', 'error')
    }

    const final = await appendWorm('CHAT_DONE', {
      model: state.model,
      format: fmt,
      responseHash: await sha256(full),
      doneSeen,
      catcode: cc
    })
    print(`\nWORM SEALED ${final.seal}${cc.flagged ? ' [CATCODE FLAGGED]' : ''}`, 'seal')

  } catch (error) {
    const fail = await appendWorm('CHAT_ERROR', { model: state.model, format: fmt, reason: error.message })
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
    const catflag = event.payload?.catcode?.flagged ? ' [CC]' : ''
    print(`${String(event.tick).padStart(3, '0')} ${event.type.padEnd(12)} ${event.seal}${catflag}`)
  })
}

function git(args) {
  const sub = args.toUpperCase()
  if (sub === 'STATUS') {
    print('ON BRANCH GH-PAGES-ROM', 'system')
    print('MODEL: GRANITE CODE 8B — IBM WATSON LINEAGE')
    print('GUARDRAILS: CATCODE + WORM + LEAN4 + TRUST DEED')
    print('REMOTE: SNAPKITTYWEST/bob-orchestrator')
    return
  }
  if (sub === 'LOG') {
    print('GRANITE EDITION — SOVEREIGN GUARDRAILS ACTIVE')
    print('PREV: NEMOTRON 4B — OLLAMA ONLY')
    return
  }
  print('GIT COMMANDS: STATUS, LOG')
}

function saveTranscript() {
  const body = JSON.stringify({
    transcript: state.transcript,
    worm: state.worm,
    catcode: state.catcode,
    model: state.model,
    format: resolveFormat()
  }, null, 2)
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
  const event = { tick: state.worm.length, ts: new Date().toISOString(), type, parentSeal, payload }
  event.seal = await sha256(JSON.stringify(event))
  state.worm.push(event)
  localStorage.setItem('gitdos-worm', JSON.stringify(state.worm, null, 2))
  sealNode.textContent = event.seal.slice(0, 16)
  return event
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
