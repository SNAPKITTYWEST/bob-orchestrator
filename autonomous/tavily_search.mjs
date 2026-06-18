/**
 * BOB Tavily Search — web grep for the Sovereign Logic Machine
 *
 * Tavily is BOB's external memory access. When the dictionary and topic
 * corpus don't know something, Tavily searches the web and BOB processes
 * the results through the oracle word lens.
 *
 * grep against the filesystem = grep
 * grep against world knowledge = Tavily
 */

import { ORACLE_LENS } from './dictionary.mjs'

const ENDPOINT = 'https://api.tavily.com/search'

let API_KEY = null

export function setTavilyKey(key) { API_KEY = key || null }
export function tavilyReady()     { return !!API_KEY }

export async function checkTavily() {
  if (!API_KEY) return false
  try {
    const r = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ api_key: API_KEY, query: 'test', max_results: 1 }),
      signal:  AbortSignal.timeout(3500),
    })
    return r.ok
  } catch { return false }
}

// ── Core search ───────────────────────────────────────────────────────────────

async function rawSearch(query, n = 3) {
  if (!API_KEY) return null
  try {
    const r = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        api_key:         API_KEY,
        query,
        search_depth:    'basic',
        max_results:     n,
        include_answer:  true,   // Tavily's own clean summary — use as primary
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(7000),
    })
    if (!r.ok) return null
    return await r.json()   // return full response: { answer, results }
  } catch { return null }
}

// ── Snippet cleaner ───────────────────────────────────────────────────────────

function cleanSnippet(text, max = 240) {
  if (!text) return ''
  let t = text
    .replace(/^[#*|]+\s*/gm, '')                // strip headings, leading asterisks, table pipes
    .replace(/\|/g, ' ')                        // remove inline pipe chars (tables)
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // strip bold markers
    .replace(/\*([^*]+)\*/g, '$1')              // strip italic markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')    // strip links, keep text
    .replace(/^[-•]\s+/gm, '')                  // strip bullet markers
    .replace(/\s+/g, ' ')
    .trim()

  // Drop leading title sentences that are too short (e.g. "Aerospace. Aerospace refers to...")
  const firstDot = t.indexOf('. ')
  if (firstDot > 0 && firstDot < 60) {
    const firstSent = t.slice(0, firstDot + 1)
    if (firstSent.split(' ').length <= 4) t = t.slice(firstDot + 2).trim()
  }

  if (t.split(' ').length < 5) return ''

  t = t.slice(0, max)
  const sentEnd = Math.max(t.lastIndexOf('. '), t.lastIndexOf('? '), t.lastIndexOf('! '))
  return sentEnd > 60 ? t.slice(0, sentEnd + 1) : t.replace(/\s+\S*$/, '') + '…'
}

// ── BOB-framed answer ─────────────────────────────────────────────────────────
// Greetings, commands, and very short words skip Tavily
const SKIP = new Set([
  'hello','hi','hey','bob','yes','no','ok','okay','sure','thanks','thank',
  'cool','nice','what','how','who','why','when','where','test','help',
])

export async function tavilyAnswer(input, oracleWord, emojiSeq) {
  if (!API_KEY) return null

  // Strip question wrappers to get the core query
  const query = input
    .replace(/^(whats|what is|what are|tell me about|explain|how does|how do i|how to|describe|define|give me|can you)/i, '')
    .replace(/[?!]/g, '')
    .trim()

  if (query.length < 4 || SKIP.has(query.toLowerCase())) return null

  const resp = await rawSearch(query)
  if (!resp) return null

  const lens = ORACLE_LENS[oracleWord]
  if (!lens) return null

  const dash = lens.indexOf(' — ')
  const verb = dash >= 0 ? lens.slice(0, dash) : oracleWord.toLowerCase()
  const body = dash >= 0 ? lens.slice(dash + 3) : lens

  // Prefer Tavily's own answer summary (clean AI-generated), fall back to result snippets
  const facts = []
  if (resp.answer && resp.answer.length > 20) {
    facts.push(resp.answer.replace(/\s+/g, ' ').trim())
  } else {
    const snippets = (resp.results || [])
      .map(r => cleanSnippet(r.content || r.snippet || r.description || ''))
      .filter(f => f.length > 20)
    facts.push(...snippets.slice(0, 2))
  }

  if (facts.length === 0) return null

  // Extract last 1-2 meaningful words for the header
  const HSTOP = new Set(['whats','what','how','the','a','an','is','are','was','were',
    'to','of','in','and','or','do','does','can','tell','me','about','best','way'])
  const subWords = query.split(/\s+/).filter(w => w.length > 2 && !HSTOP.has(w.toLowerCase()))
  const subject  = subWords.slice(-2).join(' ') || query
  const sub      = subject.charAt(0).toUpperCase() + subject.slice(1)

  return [
    `${sub.toUpperCase()} · ${oracleWord}`,
    ``,
    facts[0],
    facts[1] ? `\n${facts[1]}` : '',
    ``,
    `${oracleWord}: ${verb} — ${body}.`,
    ``,
    `Oracle: ${oracleWord} · ${emojiSeq}`,
  ].filter(l => l !== '').join('\n')
}
