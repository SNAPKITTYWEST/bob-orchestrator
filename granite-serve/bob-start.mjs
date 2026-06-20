#!/usr/bin/env node
/**
 * bob-start.mjs — Sovereign model launcher
 * Auto-detects platform → vLLM on Linux, Ollama on Windows
 *
 * Usage:
 *   node granite-serve/bob-start.mjs           # auto
 *   node granite-serve/bob-start.mjs --vllm    # force vLLM
 *   node granite-serve/bob-start.mjs --ollama  # force Ollama
 */

import { execSync, spawn } from 'child_process'
import { platform, networkInterfaces } from 'os'

const IS_WIN   = platform() === 'win32'
const USE_VLLM = process.argv.includes('--vllm')  || !IS_WIN
const PORT_VLLM   = 8000
const PORT_OLLAMA = 11434
const MODEL_VLLM  = 'ibm-granite/granite-code-8b-instruct'

function localIP() {
  for (const iface of Object.values(networkInterfaces())) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address
    }
  }
  return '127.0.0.1'
}

function printConfig(port, fmt, model) {
  const ip = localIP()
  console.log('')
  console.log('  PASTE INTO APPLE GITDOS:')
  console.log(`  ENDPOINT http://${ip}:${port}`)
  console.log(`  FORMAT ${fmt}`)
  console.log(`  MODEL ${model}`)
  console.log('')
}

console.log('  SEIT SOVEREIGN STACK — GRANITE CODE ENGINE')
console.log(`  Platform: ${platform()} | Backend: ${USE_VLLM ? 'vLLM' : 'Ollama'}`)

if (USE_VLLM) {
  try { execSync('python3 -c "import vllm"', { stdio: 'pipe' }) }
  catch { execSync('pip install vllm bitsandbytes', { stdio: 'inherit' }) }

  console.log(`  Serving ${MODEL_VLLM} on :${PORT_VLLM} with 4-bit quant...`)
  printConfig(PORT_VLLM, 'openai', 'granite-code')

  spawn('python3', [
    '-m', 'vllm.entrypoints.openai.api_server',
    '--model', MODEL_VLLM,
    '--port', String(PORT_VLLM),
    '--host', '0.0.0.0',
    '--dtype', 'float16',
    '--quantization', 'bitsandbytes',
    '--load-format', 'bitsandbytes',
    '--max-model-len', '4096',
    '--gpu-memory-utilization', '0.88',
    '--trust-remote-code',
    '--served-model-name', 'granite-code'
  ], { stdio: 'inherit' }).on('exit', code => process.exit(code))

} else {
  try { execSync('ollama list 2>nul | findstr granite-code', { stdio: 'pipe' }) }
  catch { execSync('ollama pull granite-code', { stdio: 'inherit' }) }

  console.log(`  Serving granite-code via Ollama on :${PORT_OLLAMA}...`)
  printConfig(PORT_OLLAMA, 'auto', 'granite-code')

  spawn('ollama', ['serve'], { stdio: 'inherit' })
    .on('exit', code => process.exit(code))
}
