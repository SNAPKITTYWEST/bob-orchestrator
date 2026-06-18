/**
 * BOB ASCII Bridge — Node.js → Python
 *
 * Spawns the Python ASCII tools and streams output to terminal.
 * Used by chat.mjs for /img and /3d commands.
 *
 * API:
 *   img2ascii(imagePath, opts)   — convert image to ASCII
 *   ascii3d(shape, opts)         — render 3D ASCII shape
 *   pythonAvailable()            — check if python3/python is on PATH
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir  = dirname(fileURLToPath(import.meta.url))
const IMG_PY = join(__dir, 'img2ascii.py')
const A3D_PY = join(__dir, 'ascii3d.py')

// ── Find Python ───────────────────────────────────────────────────────────────

export async function pythonAvailable() {
  for (const cmd of ['python', 'python3']) {
    const ok = await new Promise(resolve => {
      const p = spawn(cmd, ['--version'], { stdio:'pipe' })
      p.on('close', code => resolve(code === 0))
      p.on('error', () => resolve(false))
    })
    if (ok) return cmd
  }
  return null
}

// ── Run a Python script, stream stdout to terminal ───────────────────────────

function runPython(pythonCmd, scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCmd, [scriptPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let out = ''
    proc.stdout.on('data', d => {
      const s = d.toString()
      out += s
      process.stdout.write(s)
    })
    proc.stderr.on('data', d => {
      // Show stderr dimly — useful for install hints
      process.stdout.write(`\x1b[2m${d.toString()}\x1b[0m`)
    })
    proc.on('close', code => {
      if (code === 0 || code === null) resolve(out)
      else reject(new Error(`Python exited with code ${code}`))
    })
    proc.on('error', e => reject(e))
  })
}

// ── img2ascii ─────────────────────────────────────────────────────────────────

export async function img2ascii(imagePath, opts = {}) {
  const py = await pythonAvailable()
  if (!py) {
    console.log('\n  Python not found. Install Python 3 from python.org\n')
    return
  }
  if (!existsSync(imagePath)) {
    console.log(`\n  Image not found: ${imagePath}\n`)
    return
  }

  const args = [imagePath]
  if (opts.width)    args.push('--width',    String(opts.width))
  if (opts.color)    args.push('--color')
  if (opts.invert)   args.push('--invert')
  if (opts.save)     args.push('--save',     opts.save)
  if (opts.mode)     args.push('--mode',     opts.mode)
  if (opts.contrast) args.push('--contrast', String(opts.contrast))
  if (opts.edge)     args.push('--edge')

  await runPython(py, IMG_PY, args)
}

// ── ascii3d ───────────────────────────────────────────────────────────────────

export async function ascii3d(shape = 'torus', opts = {}) {
  const py = await pythonAvailable()
  if (!py) {
    console.log('\n  Python not found. Install Python 3 from python.org\n')
    return
  }

  const args = [shape]
  if (opts.anim)   args.push('--anim')
  if (opts.frames) args.push('--frames', String(opts.frames))
  if (opts.fps)    args.push('--fps',    String(opts.fps))
  if (opts.width)  args.push('--width',  String(opts.width))
  if (opts.height) args.push('--height', String(opts.height))
  if (opts.save)   args.push('--save',   opts.save)
  if (opts.rx)     args.push('--rx',     String(opts.rx))
  if (opts.ry)     args.push('--ry',     String(opts.ry))
  if (opts.rz)     args.push('--rz',     String(opts.rz))
  if (opts.shade)  args.push('--shade',  opts.shade)

  await runPython(py, A3D_PY, args)
}

// ── CLI test ──────────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith('bob_ascii.mjs')) {
  const mode  = process.argv[2] || '3d'
  const shape = process.argv[3] || 'torus'

  if (mode === 'img' || mode === 'image') {
    const path = process.argv[3]
    if (!path) {
      console.log('\n  Usage: node ascii/bob_ascii.mjs img path/to/image.jpg [--color]\n')
    } else {
      const color = process.argv.includes('--color')
      await img2ascii(path, { width: 100, color })
    }
  } else {
    console.log(`\n  Rendering: ${shape}\n`)
    await ascii3d(shape, { width:80, height:40 })
  }
}
