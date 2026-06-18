/**
 * HolyC Simulator — AST evaluator for HOLYC_SIM mode
 * No host machine code executes here.
 * All built-ins map to sovereign BOB operations.
 */

import { checkCallPolicy } from './holy_sandbox_policy.mjs'

// ── Evaluator ────────────────────────────────────────────────────────────────

export function createSimContext ({ mode, worm, agent, adaGate }) {
  const env    = new Map()   // variable scope
  const output = []          // print buffer
  const events = []          // WORM events from this run

  // ── Built-in functions ───────────────────────────────────────────────────

  const builtins = {
    Print (args) {
      const text = String(args[0] ?? '')
      output.push(text.replace(/\n$/, ''))
      return null
    },

    AgentStatus (args) {
      const status = [
        `AGENT: ${agent.name}`,
        `CLASS: ${agent.agentClass}`,
        `TRUST: ${agent.trust}`,
        `CAPS:  ${agent.capabilities.join(', ')}`,
        `STATE: ${agent.state?.toFixed(4) ?? '0.0000'}`,
        `SEAL:  ${agent.worm_seal?.slice(0, 16) ?? 'none'}…`
      ]
      status.forEach(l => output.push(l))
      return { name: agent.name, class: agent.agentClass, trust: agent.trust }
    },

    WormSeal (args) {
      const payload = String(args[0] ?? 'HOLYC_EVENT')
      const event   = worm.seal(`HOLYC:${agent.name}`, payload, { class: agent.agentClass })
      events.push(event)
      output.push(`WORM SEALED: ${event.seal.slice(0, 16)}…`)
      return event.seal
    },

    TrustCheck (args) {
      const cap    = String(args[0] ?? 'read')
      const result = adaGate.checkCapability(agent.agentClass, cap)
      output.push(`TRUST CHECK [${cap}]: ${result ? 'ALLOWED' : 'DENIED'}`)
      return result ? 1 : 0
    },

    GetModel (args) {
      const model = agent.model || 'nemotron'
      output.push(`MODEL: ${model}`)
      return model
    },

    GetTrust (args) {
      const levels = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, SOVEREIGN: 4 }
      return levels[agent.trust] ?? 0
    },

    GetClass (args) {
      output.push(`CLASS: ${agent.agentClass}`)
      return agent.agentClass
    },

    Assert (args) {
      const cond    = args[0]
      const message = String(args[1] ?? 'Assertion failed')
      const ok      = cond !== 0 && cond !== null && cond !== false && cond !== ''
      if (!ok) {
        output.push(`ASSERT FAILED: ${message}`)
        throw new Error(`HolyC assertion failed: ${message}`)
      }
      output.push(`ASSERT OK: ${message}`)
      return 1
    }
  }

  // ── Expression evaluator ─────────────────────────────────────────────────

  function evalExpr (node) {
    switch (node.type) {
      case 'number': return node.value
      case 'string': return node.value
      case 'ident':  return env.has(node.name) ? env.get(node.name) : 0

      case 'call': {
        const policy = checkCallPolicy(node.name, mode)
        if (!policy.allowed) throw new Error(`POLICY BLOCK: ${policy.reason}`)
        if (builtins[node.name]) {
          const args = node.args.map(evalExpr)
          return builtins[node.name](args)
        }
        throw new Error(`Unknown HolyC function: ${node.name}`)
      }

      case 'binop': {
        const L = evalExpr(node.left)
        const R = evalExpr(node.right)
        switch (node.op) {
          case '+':  return L + R
          case '-':  return L - R
          case '*':  return L * R
          case '/':  return R !== 0 ? L / R : 0
          case '==': return L === R ? 1 : 0
          case '!=': return L !== R ? 1 : 0
          case '<':  return L <   R ? 1 : 0
          case '>':  return L >   R ? 1 : 0
          case '<=': return L <=  R ? 1 : 0
          case '>=': return L >=  R ? 1 : 0
          case '&&': return (L && R) ? 1 : 0
          case '||': return (L || R) ? 1 : 0
          default:   throw new Error(`Unknown op: ${node.op}`)
        }
      }

      case 'unop': {
        const v = evalExpr(node.expr)
        if (node.op === '!')   return v ? 0 : 1
        if (node.op === 'neg') return -v
        throw new Error(`Unknown unary op: ${node.op}`)
      }

      default:
        throw new Error(`Unknown expr type: ${node.type}`)
    }
  }

  // ── Statement evaluator ──────────────────────────────────────────────────

  function evalStmt (node) {
    switch (node.type) {
      case 'declare':
        env.set(node.name, evalExpr(node.value))
        break

      case 'assign':
        env.set(node.name, evalExpr(node.value))
        break

      case 'print_stmt':
        output.push(String(evalExpr(node.value)))
        break

      case 'expr_stmt':
        evalExpr(node.expr)
        break

      case 'if': {
        const cond = evalExpr(node.condition)
        const branch = (cond !== 0 && cond !== null && cond !== false) ? node.then : node.else
        for (const s of branch) evalStmt(s)
        break
      }

      case 'while': {
        let guard = 0
        while (evalExpr(node.condition) && guard < 1000) {
          for (const s of node.body) evalStmt(s)
          guard++
        }
        if (guard >= 1000) output.push('[WARN] while loop iteration limit reached (1000)')
        break
      }

      default:
        throw new Error(`Unknown stmt type: ${node.type}`)
    }
  }

  function run (ast) {
    for (const stmt of ast.body) evalStmt(stmt)
    return { output, events }
  }

  return { run }
}
