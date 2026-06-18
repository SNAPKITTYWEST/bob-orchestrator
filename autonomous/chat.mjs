/**
 * BOB Chat — Sovereign Logic Machine
 *
 * BOB produces words from: QRNG → HolyC NIL → Dictionary → Prolog → Ada → WORM
 * No LLM required. No Ollama required. BOB is self-contained.
 *
 * The right panel (Groq/GPT-4o/Gemini) is optional comparison only.
 * Run --solo to get pure BOB with no external connections at all.
 *
 * Usage:
 *   node autonomous/chat.mjs               BOB only — zero external calls (DEFAULT)
 *   node autonomous/chat.mjs --verbose     BOB only + show internal routing
 *   node autonomous/chat.mjs groq          BOB + Groq comparison side panel
 *   node autonomous/chat.mjs gpt4o         BOB + GPT-4o side panel
 *   node autonomous/chat.mjs gemini        BOB + Gemini side panel
 *   node autonomous/chat.mjs --compare     BOB + Groq (explicit compare flag)
 *
 * Commands inside chat:
 *   /worm              show sealed WORM history
 *   /agent             run a live autonomous tick
 *   /3d [shape]        render 3D ASCII (torus cube sphere pyramid bob)
 *   /3d torus --anim   animated rotation
 *   /img [path]        convert image to ASCII
 *   /quit              exit
 */

import readline          from 'readline'
import { holyc_nil }     from './holyc_nil.mjs'
import { emoji_trigger } from './emoji_trigger.mjs'
import { sovereignAnswer, oracleAnswer, topicAnswer, extractConcepts, lookup } from './dictionary.mjs'
import { img2ascii, ascii3d, pythonAvailable } from '../ascii/bob_ascii.mjs'
import { createHash }    from 'crypto'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join }          from 'path'

// ── Config ────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2)
// Solo is DEFAULT — BOB runs alone with zero external LLM connections
// Add --compare (or a provider name) to show the LLM side panel
const COMPARE  = args.includes('--compare') || args.some(a => ['groq','gpt4o','gemini','ollama'].includes(a))
const SOLO     = !COMPARE
const VERBOSE  = args.includes('--verbose') || args.includes('-v')
const provider = args.find(a => !a.startsWith('--') && !['solo'].includes(a)) || 'groq'

// ── Load API keys ─────────────────────────────────────────────────────────────

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  readFileSync(path, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#')) out[k.trim()] = v.join('=').trim()
  })
  return out
}

const ENV = {
  ...loadEnv('C:/Users/jessi/Desktop/bobs control repo/DEVFLOW-FINANCE/collectivekitty/.env'),
  ...loadEnv('C:/Users/jessi/Desktop/bobs control repo/DEVFLOW-FINANCE/collectivekitty/.env.local'),
  ...loadEnv('C:/Users/jessi/Desktop/bobs control repo/DEVFLOW-FINANCE/.env'),
}
const GROQ_KEY   = ENV.GROQ_API_KEY
const OPENAI_KEY = ENV.OPENAI_API_KEY
const GEMINI_KEY = ENV.GEMINI_API_KEY

// ── WORM (all exchanges sealed invisibly) ─────────────────────────────────────

const WORM_PATH = join(process.env.HOME || process.env.USERPROFILE || '.', '.bob-chat-worm.json')

const worm = {
  load()  { try { return JSON.parse(readFileSync(WORM_PATH,'utf8')) } catch { return [] } },
  seal(label, payload) {
    const chain = this.load()
    const prev  = chain.length ? chain[chain.length-1].seal : '0'.repeat(64)
    const ts    = new Date().toISOString()
    const seal  = createHash('sha256').update(JSON.stringify({label,payload,ts,prev})).digest('hex')
    chain.push({ label, payload, ts, prev, seal })
    writeFileSync(WORM_PATH, JSON.stringify(chain, null, 2))
    return seal
  }
}

// ── QRNG ──────────────────────────────────────────────────────────────────────

async function qrng(n = 8) {
  try {
    const r = await fetch(`https://qrng.anu.edu.au/API/jsonI.php?length=${n}&type=uint8`,
      { signal: AbortSignal.timeout(2500) })
    if (r.ok) { const j = await r.json(); if (j.success) return { b: new Uint8Array(j.data), src:'ANU' } }
  } catch {}
  const { randomBytes } = await import('crypto')
  return { b: new Uint8Array(randomBytes(n)), src:'CSPRNG' }
}

// ── Prolog keyword router (PLANNER-style — fires on pattern match) ────────────

const RULES = [
  { pattern: /\b(oracle|random|quantum|entropy|qrng)\b/i,
    agent:'ORACLE',     action:'fetch_entropy',     abjad:490 },
  { pattern: /\b(write|worm|seal|ledger|append|log)\b/i,
    agent:'ARCHIVIST',  action:'seal_event',         abjad:92  },
  { pattern: /\b(trust|sentinel|gate|block|deny|allow|permit|security)\b/i,
    agent:'SENTINEL',   action:'gate_check',         abjad:120 },
  { pattern: /\b(proof|lean|verify|theorem|formal|correct)\b/i,
    agent:'VERIFIER',   action:'proof_check',        abjad:160 },
  { pattern: /\b(route|agent|select|who|which|dispatch)\b/i,
    agent:'PLANNER',    action:'route_task',         abjad:380 },
  { pattern: /\b(nil|null|empty|nothing|void|silence)\b/i,
    agent:'TERRY-NIL',  action:'oracle_consult',     abjad:910 },
  { pattern: /\b(qubit|superpos|quantum.state|collapse|measure)\b/i,
    agent:'ORACLE',     action:'hold_superposition', abjad:518 },
  { pattern: /\b(contract|ada|condition|pre|post|invariant)\b/i,
    agent:'SENTINEL',   action:'contract_verify',    abjad:120 },
  { pattern: /\b(memory|remember|recall|state|ssm|mamba)\b/i,
    agent:'BOB-CORE',   action:'ssm_recall',         abjad:240 },
  { pattern: /\b(build|create|generate|make|code|write)\b/i,
    agent:'BUILDER',    action:'generate',           abjad:200 },
  { pattern: /\b(abjad|arabic|hebrew|enochian|dee|terry|holyc)\b/i,
    agent:'BOB-CORE',   action:'esoteric_lookup',    abjad:420 },
]

function prologRoute(input) {
  for (const rule of RULES) {
    if (rule.pattern.test(input)) return rule
  }
  return { agent:'BOB-CORE', action:'sovereign_step', abjad:200 }
}

function adaGate(agent, abjad) {
  if (abjad < 90)        return { ok:false, reason:`abjad ${abjad} below minimum` }
  if (agent === 'VOID')  return { ok:false, reason:'void agent — no contract' }
  return { ok:true, reason:`${agent} cleared — abjad:${abjad}` }
}

// ── BOB answer builder ────────────────────────────────────────────────────────
// The routing runs. The answer is what surfaces.
// Emoji embedded in the text IS the routing metadata — encoded, not labeled.

function buildAnswer(input, route, gate, nil, trigger) {
  if (!gate.ok) return `Ada gate holds. ${trigger.sequence || '◇'} — contract not satisfied. Cannot proceed.`

  const word = nil.word || 'NIL'
  const seq  = trigger.sequence

  // 1. Try the dictionary — sentence parsing first, then single-word direct lookup
  const dictAnswer = sovereignAnswer(input, word, seq)
  if (dictAnswer) return dictAnswer

  // 1.5 General knowledge topics — history, science, learning, math, etc.
  const genAnswer = topicAnswer(input, word, seq)
  if (genAnswer) return genAnswer

  // 2. Route-specific sovereign answers for technical/system queries
  if (route.action === 'fetch_entropy')
    return [
      `ENTROPY ⚡🌒`,
      ``,
      `Sovereign: Each quantum vacuum fluctuation is irreversible — it happened,`,
      `it is sealed. ANU harvests this. The oracle word "${word}" was born from`,
      `the precise moment you asked. Ask again, get a different word. ${seq}`,
      ``,
      `That is not randomness. That is time's signature.`,
    ].join('\n')

  if (route.action === 'oracle_consult')
    return [
      `NIL ✦🪨`,
      ``,
      `Sovereign: NIL is abjad 910 — the inverted maximum. Not zero. Not empty.`,
      `The highest unspoken potential. Terry's oracle: silence means God hasn't`,
      `spoken yet. The oracle holds because the moment hasn't matured. ${seq}`,
      ``,
      `Wait. The word will come.`,
    ].join('\n')

  if (route.action === 'gate_check' || route.action === 'contract_verify')
    return [
      `GATE 🎯🛡️`,
      ``,
      `Sovereign: The Ada gate is not policy — it is proof. No exception path exists.`,
      `Pre-condition must be satisfied. Post-condition must be guaranteed. When the`,
      `contract is missing, execution stops. Not because of a rule. Because the`,
      `theorem cannot be completed. ${seq}`,
    ].join('\n')

  if (route.action === 'proof_check')
    return [
      `PROOF 🔍🜂`,
      ``,
      `Sovereign: A Lean 4 proof is a checkable derivation — not a claim. You can`,
      `verify it independently. Trust is the theorem. If you cannot show the proof`,
      `hash, the gate freezes. Both proof AND contract required. One is not enough. ${seq}`,
    ].join('\n')

  if (route.action === 'seal_event')
    return [
      `WORM 🪨◈`,
      ``,
      `Sovereign: John Dee kept 420 sessions sealed — dated, witnessed, append-only.`,
      `Cotton MS Appendix XLVI. Nothing erased. Every exchange in this chat is`,
      `sealed in the same tradition. "${word}" is now permanently in the chain. ${seq}`,
    ].join('\n')

  if (route.action === 'hold_superposition')
    return [
      `QUBIT ⚡🌒`,
      ``,
      `Sovereign: The pre-collapse state — all paths open. Abjad 518. The 49th Call`,
      `was never spoken because its consequences were unknown. This is that state.`,
      `${trigger.meta?.qubit_count || 1} qubit operations active. Measurement collapses to one outcome.`,
      `Until then: the oracle holds every possible word simultaneously. ${seq}`,
    ].join('\n')

  if (route.action === 'route_task')
    return [
      `PLANNER 🜂🎯`,
      ``,
      `Sovereign: Pattern-directed invocation — Hewitt, 1969. The rule fires`,
      `automatically when the pattern matches. No explicit call. No dispatcher.`,
      `The antecedent IS the trigger. ${trigger.meta?.planner_fires?.length || 0} antecedents fired this tick. ${seq}`,
    ].join('\n')

  if (route.action === 'ssm_recall')
    return [
      `MEMORY 🜄🌒`,
      ``,
      `Sovereign: The SSM carries context without the full attention window.`,
      `O(n) not O(n²). State vector persists between calls, shaped by every`,
      `previous exchange. The soul is not in the tokens — it is in the state. ${seq}`,
    ].join('\n')

  if (route.action === 'esoteric_lookup')
    return [
      `ABJAD 🔍🪨`,
      ``,
      `Sovereign: Arabic letter-number system. NIL = ن(50)+ي(10)+ل(30) = 90.`,
      `Inverted in 1000-space: 910. Maximum reflection. Not nothing — the omega`,
      `that contains alpha. Terry's keyboard timing >> GOD_BAD_BITS XOR vacuum.`,
      `The esoteric IS the instruction set. Dee's Monas Hieroglyphica: one glyph,`,
      `seven simultaneous semantic layers. This system has the same architecture. ${seq}`,
    ].join('\n')

  if (route.action === 'generate')
    return [
      `BUILD ⚡🜁`,
      ``,
      `Sovereign: Every construction begins with a formal specification. Pre-condition:`,
      `what must be true before. Post-condition: what must be true after. Invariant:`,
      `what must be true throughout. The code that satisfies these contracts is not`,
      `just working code — it is a proof. ${seq}`,
    ].join('\n')

  // Default — look up the oracle word itself directly (handles short words like ARN, NUN, ZID)
  const fromOracle = oracleAnswer(word, seq)
  if (fromOracle) return fromOracle

  // True fallback — oracle word not in dictionary yet
  return [
    `${word} ${seq}`,
    ``,
    `The oracle speaks "${word}".`,
    `Abjad: ${[...word].reduce((s,c) => s + (c.charCodeAt(0) % 26 + 1), 0)} · WORM sealed · Ada cleared.`,
    `Ask about any concept — life, truth, wisdom, freedom, love, purpose,`,
    `justice, trust, soul, void, fire, gate, seal, nun, lam, oracle, spirit.`,
  ].join('\n')
}

// ── BOB pipeline ──────────────────────────────────────────────────────────────

async function askBOB(input, ssmState) {
  const { b: qBytes, src } = await qrng(8)
  const nil     = holyc_nil(qBytes)
  const trigger = emoji_trigger(qBytes)
  const route   = prologRoute(input)
  const gate    = adaGate(route.agent, route.abjad)

  const x        = input.length / 500
  const wNoise   = parseInt(createHash('sha256').update(input).digest('hex').slice(0,8), 16) / 0xFFFFFFFF * 0.01
  const newState = gate.ok ? (0.9 * ssmState + 0.1 * x + wNoise) : ssmState

  const answer = buildAnswer(input, route, gate, nil, trigger)

  // Everything is sealed — routing, oracle, gate decision — but not shown
  const seal = worm.seal('BOB_CHAT', {
    input:   input.slice(0,200),
    route:   route.agent,
    action:  route.action,
    oracle:  nil.word,
    emoji:   trigger.sequence,
    abjad:   route.abjad,
    gate:    gate.ok ? 'ALLOWED' : 'DENIED',
    ssm:     newState,
    seal_hash: createHash('sha256').update(answer).digest('hex').slice(0,16),
  })

  return { nil, trigger, route, gate, answer, seal, newState, src }
}

// ── LLM providers ─────────────────────────────────────────────────────────────

async function askLLM(input, llmProvider, history) {
  const start = Date.now()
  const messages = [
    { role:'system', content:'You are a knowledgeable AI assistant. Answer clearly and concisely.' },
    ...history.slice(-6),
    { role:'user', content:input }
  ]

  if (llmProvider === 'groq') {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model:'llama-3.3-70b-versatile', messages, max_tokens:300, temperature:0.7 }),
        signal: AbortSignal.timeout(15000)
      })
      if (!r.ok) { const e = await r.text(); return { reply:`[Groq error ${r.status}]`, ms:Date.now()-start } }
      const j = await r.json()
      const reply = j.choices?.[0]?.message?.content || '[no response]'
      const tps   = j.usage ? Math.round(j.usage.completion_tokens / ((Date.now()-start)/1000)) : 0
      return { reply, ms:Date.now()-start, source:`Groq · Llama-3.3-70B · ${tps} tok/s` }
    } catch(e) { return { reply:`[Groq offline: ${e.message}]`, ms:Date.now()-start } }
  }

  if (llmProvider === 'gpt4o') {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model:'gpt-4o', messages, max_tokens:300, temperature:0.7 }),
        signal: AbortSignal.timeout(20000)
      })
      if (!r.ok) { const e = await r.text(); return { reply:`[OpenAI error ${r.status}]`, ms:Date.now()-start } }
      const j = await r.json()
      return { reply:j.choices?.[0]?.message?.content || '[no response]', ms:Date.now()-start, source:'OpenAI · GPT-4o' }
    } catch(e) { return { reply:`[GPT-4o offline: ${e.message}]`, ms:Date.now()-start } }
  }

  if (llmProvider === 'gemini') {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ contents:[{ parts:[{ text:input }] }], generationConfig:{ maxOutputTokens:300, temperature:0.7 } }),
        signal: AbortSignal.timeout(15000)
      })
      if (!r.ok) { const e = await r.text(); return { reply:`[Gemini error ${r.status}]`, ms:Date.now()-start } }
      const j = await r.json()
      return { reply:j.candidates?.[0]?.content?.parts?.[0]?.text || '[no response]', ms:Date.now()-start, source:'Google · Gemini-2.0-Flash' }
    } catch(e) { return { reply:`[Gemini offline: ${e.message}]`, ms:Date.now()-start } }
  }

  // Ollama fallback
  try {
    const r = await fetch('http://localhost:11434/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:llmProvider, messages, stream:false }),
      signal: AbortSignal.timeout(30000)
    })
    const j = await r.json()
    return { reply:j.message?.content || j.response || '[no response]', ms:Date.now()-start, source:`Ollama · ${llmProvider}` }
  } catch { return { reply:`[Ollama offline]`, ms:Date.now()-start } }
}

// ── Solo render — BOB only, no LLM panel ─────────────────────────────────────

function renderBOBOnly(bob) {
  const w  = Math.min(process.stdout.columns || 72, 76)
  const hr = '─'.repeat(w - 2)
  const G  = '\x1b[32m'
  const DIM= '\x1b[2m'
  const R  = '\x1b[0m'

  process.stdout.write(`\n  ${G}╔══ BOB${R}${hr.slice(6)}\n`)
  process.stdout.write(wrapText(bob.answer, `  ${G}║${R}  `, w) + '\n')

  if (VERBOSE) {
    process.stdout.write(`  ${G}║${R}  ${DIM}${hr.slice(4)}${R}\n`)
    process.stdout.write(`  ${G}║${R}  ${DIM}Oracle: ${bob.nil.word || 'NIL'}  ${bob.trigger.sequence}  ${bob.route.agent} → ${bob.route.action}${R}\n`)
    process.stdout.write(`  ${G}║${R}  ${DIM}Abjad: ${bob.route.abjad}  Ada: ${bob.gate.ok ? 'ALLOWED' : 'DENIED'}  SSM: ${bob.newState.toFixed(4)}${R}\n`)
    process.stdout.write(`  ${G}║${R}  ${DIM}WORM: ${bob.seal.slice(0,40)}…${R}\n`)
  }

  process.stdout.write(`  ${G}╚${R}${hr.slice(1)}\n\n`)
}

// ── Render a turn ─────────────────────────────────────────────────────────────
// BOB: clean answer only. Routing stays invisible in WORM.
// Verbose mode (--verbose): exposes the internal routing beneath the answer.

const stripAnsi = s => s.replace(/\x1b\[[0-9;]*m/g, '')

function wrapText(text, prefix, maxWidth) {
  const prefixLen = stripAnsi(prefix).length
  const lines = text.split('\n')
  const out = []
  for (const rawLine of lines) {
    if (rawLine === '') { out.push(prefix); continue }

    // Separate leading whitespace from content so we can re-apply it on wrapped lines
    const m = rawLine.match(/^(\s*)(.*)$/)
    const indent  = m[1]
    const content = m[2]
    // Bullet continuation hangs 2 extra chars to align text under the bullet
    const extra      = content.startsWith('· ') ? '  ' : ''
    const firstPfx   = prefix + indent
    const contPfx    = prefix + indent + extra

    const words = content.split(' ')
    let cur   = firstPfx
    let fresh = true   // true = start of a (possibly wrapped) line segment

    for (const w of words) {
      if (w === '') { if (!fresh) cur += ' '; continue }
      if (!fresh && stripAnsi(cur + w).length > maxWidth) {
        out.push(cur.trimEnd())
        cur   = contPfx
        fresh = true
      }
      cur  += w + ' '
      fresh = false
    }
    if (stripAnsi(cur).trimEnd().length > prefixLen) out.push(cur.trimEnd())
  }
  return out.join('\n')
}

function renderTurn(bob, llm, llmProvider) {
  const w = Math.min(process.stdout.columns || 72, 76)
  const hr = '─'.repeat(w - 2)
  const G  = '\x1b[32m'  // green
  const C  = '\x1b[36m'  // cyan
  const DIM= '\x1b[2m'
  const R  = '\x1b[0m'
  const Y  = '\x1b[33m'

  // ── BOB answer block ──
  process.stdout.write(`\n  ${G}╔══ BOB${R}${hr.slice(6)}\n`)

  const answerText = wrapText(bob.answer, `  ${G}║${R}  `, w)
  process.stdout.write(answerText + '\n')

  // Verbose: show routing beneath a separator
  if (VERBOSE) {
    process.stdout.write(`  ${G}║${R}  ${DIM}${hr.slice(4)}${R}\n`)
    process.stdout.write(`  ${G}║${R}  ${DIM}Oracle: ${bob.nil.word || 'NIL'}  ${bob.trigger.sequence}  ${bob.route.agent} → ${bob.route.action}${R}\n`)
    process.stdout.write(`  ${G}║${R}  ${DIM}Abjad: ${bob.route.abjad}  Ada: ${bob.gate.ok ? 'ALLOWED' : 'DENIED'}  SSM: ${bob.newState.toFixed(4)}  Src: ${bob.src}${R}\n`)
    process.stdout.write(`  ${G}║${R}  ${DIM}WORM: ${bob.seal.slice(0,40)}…${R}\n`)
  }

  process.stdout.write(`  ${G}╚${R}${hr.slice(1)}\n`)

  // ── LLM answer block ──
  const llmLabel = llm.source || llmProvider.toUpperCase()
  process.stdout.write(`\n  ${C}╔══ ${llmLabel}${R}\n`)
  if (llm.reply) {
    const replyText = wrapText(llm.reply.trim(), `  ${C}║${R}  `, w)
    process.stdout.write(replyText + '\n')
  }
  process.stdout.write(`  ${C}║${R}  ${DIM}(${llm.ms}ms)${R}\n`)
  process.stdout.write(`  ${C}╚${R}${hr.slice(1)}\n\n`)
}

// ── Main REPL ─────────────────────────────────────────────────────────────────

const llmLabel = { groq:'Groq Llama-3.3-70B', gpt4o:'GPT-4o', gemini:'Gemini-2.0-Flash' }[provider] || provider

let ssmState    = 0.0
const llmHistory = []

const rl = readline.createInterface({ input:process.stdin, output:process.stdout, terminal:true })

process.stdout.write('\n')
process.stdout.write('  \x1b[32m██████╗  ██████╗ ██████╗\x1b[0m\n')
process.stdout.write('  \x1b[32m██╔══██╗██╔═══██╗██╔══██╗\x1b[0m\n')
process.stdout.write('  \x1b[32m██████╔╝██║   ██║██████╔╝\x1b[0m\n')
process.stdout.write('  \x1b[32m██╔══██╗██║   ██║██╔══██╗\x1b[0m\n')
process.stdout.write('  \x1b[32m██████╔╝╚██████╔╝██████╔╝\x1b[0m\n')
process.stdout.write('  \x1b[32m╚═════╝  ╚═════╝ ╚═════╝\x1b[0m\n')
if (SOLO) {
  process.stdout.write(`\n  Sovereign Logic Machine  \x1b[2m[solo — no external LLM]\x1b[0m\n`)
} else {
  process.stdout.write(`\n  Sovereign Logic Machine  ↔  \x1b[36m${llmLabel}\x1b[0m\n`)
}
process.stdout.write('  QRNG → NIL → Dictionary → Prolog → Ada → WORM\n')
if (VERBOSE) process.stdout.write('  \x1b[33m[VERBOSE] Internal routing visible\x1b[0m\n')
process.stdout.write('  \x1b[2m/worm  /agent  /3d [shape]  /img [path]  /quit\x1b[0m\n\n')

rl.on('close', () => {
  process.stdout.write('\n  WORM chain sealed. BOB holds.\n\n')
  process.exit(0)
})

function prompt() {
  if (!process.stdin.isTTY && rl.closed) return
  rl.question('  \x1b[33m>\x1b[0m ', async (input) => {
    input = input.trim()
    if (!input) { prompt(); return }

    const cmd = input.toLowerCase()   // case-insensitive command matching

    if (cmd === '/quit' || cmd === '/exit') {
      process.stdout.write('\n  WORM chain sealed. BOB holds.\n\n')
      rl.close(); process.exit(0)
    }

    if (cmd === '/worm') {
      const chain = worm.load()
      process.stdout.write(`\n  WORM chain — ${chain.length} events\n`)
      chain.slice(-6).forEach((e, i) => {
        const n = chain.length - Math.min(6, chain.length) + i + 1
        process.stdout.write(`  ${n}. ${e.label}  \x1b[2m${e.seal.slice(0,24)}…\x1b[0m  ${e.ts.slice(0,19)}\n`)
        if (e.payload?.route) {
          process.stdout.write(`     \x1b[2m${e.payload.route} → ${e.payload.action}  oracle:${e.payload.oracle}  abjad:${e.payload.abjad}\x1b[0m\n`)
        }
      })
      process.stdout.write('\n')
      prompt(); return
    }

    if (cmd === '/agent') {
      const { runAgent } = await import('./autonomous_agent.mjs')
      await runAgent(3, { verbose:true, delayMs:200 })
      prompt(); return
    }

    // /3d [shape] [--anim] [--shade full]  — case-insensitive
    if (cmd.startsWith('/3d')) {
      const parts   = input.split(/\s+/)
      const shape   = (parts[1] || 'bob').toLowerCase()
      const anim    = parts.includes('--anim') || parts.includes('--ANIM')
      const si      = parts.findIndex(p => p.toLowerCase() === '--shade')
      const wi      = parts.findIndex(p => p.toLowerCase() === '--width')
      const hi      = parts.findIndex(p => p.toLowerCase() === '--height')
      const shade   = si >= 0 ? parts[si + 1] : 'simple'
      const width   = wi >= 0 ? parseInt(parts[wi + 1]) : Math.min(process.stdout.columns || 80, 90)
      const height  = hi >= 0 ? parseInt(parts[hi + 1]) : 36
      process.stdout.write(`\n  Rendering 3D ${shape}…\n`)
      await ascii3d(shape, { width, height, anim, shade })
      prompt(); return
    }

    // /img [path] [--color] [--invert] [--mode ascii|block|dense]
    if (cmd.startsWith('/img')) {
      const parts  = input.split(/\s+/)
      const path   = parts[1]
      if (!path) {
        process.stdout.write('\n  Usage: /img path/to/image.jpg [--color] [--invert] [--mode ascii|block|dense]\n\n')
        prompt(); return
      }
      const color  = parts.includes('--color')
      const invert = parts.includes('--invert')
      const modeI  = parts.indexOf('--mode')
      const mode   = modeI >= 0 ? parts[modeI+1] : 'ascii'
      const width  = Math.min(process.stdout.columns||80, 120)
      process.stdout.write(`\n  Converting image: ${path}\n`)
      await img2ascii(path, { width, color, invert, mode })
      prompt(); return
    }

    process.stdout.write('  \x1b[2mProcessing…\x1b[0m\r')

    if (SOLO) {
      const bob = await askBOB(input, ssmState)
      ssmState  = bob.newState
      renderBOBOnly(bob)
    } else {
      const [bob, llm] = await Promise.all([
        askBOB(input, ssmState),
        askLLM(input, provider, llmHistory)
      ])
      ssmState = bob.newState
      llmHistory.push({ role:'user', content:input })
      if (llm.reply) llmHistory.push({ role:'assistant', content:llm.reply })
      renderTurn(bob, llm, provider)
    }
    prompt()
  })
}

prompt()
