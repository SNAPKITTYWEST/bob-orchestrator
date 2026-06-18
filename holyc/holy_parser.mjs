/**
 * HolyC Parser — tokenizer + recursive descent parser
 * Produces an AST safe for HOLYC_SIM evaluation.
 * Supports: Print, AgentStatus, WormSeal, TrustCheck, U64/I64/U8/Bool,
 *           if/else, while, assignment, arithmetic, comparison, comments.
 */

// ── Token types ──────────────────────────────────────────────────────────────

export const T = {
  IDENT: 'IDENT', STRING: 'STRING', NUMBER: 'NUMBER',
  LPAREN: '(', RPAREN: ')', LBRACE: '{', RBRACE: '}',
  SEMI: ';', COMMA: ',',
  EQ: '=', EQEQ: '==', NEQ: '!=',
  LT: '<', GT: '>', LE: '<=', GE: '>=',
  PLUS: '+', MINUS: '-', STAR: '*', SLASH: '/',
  AND: '&&', OR: '||', NOT: '!',
  EOF: 'EOF'
}

const KEYWORDS = new Set(['if', 'else', 'while', 'return', 'U64', 'I64', 'U8', 'F64', 'Bool', 'U0'])

// ── Tokenizer ────────────────────────────────────────────────────────────────

export function tokenize (src) {
  const tokens = []
  let i = 0

  while (i < src.length) {
    // Whitespace
    if (/\s/.test(src[i])) { i++; continue }

    // Line comment
    if (src[i] === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }

    // Block comment
    if (src[i] === '/' && src[i + 1] === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2
      continue
    }

    // String literal
    if (src[i] === '"') {
      let s = ''
      i++
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') {
          i++
          const esc = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"' }
          s += esc[src[i]] ?? src[i]
        } else {
          s += src[i]
        }
        i++
      }
      i++ // closing "
      tokens.push({ type: T.STRING, value: s })
      continue
    }

    // Number
    if (/[0-9]/.test(src[i])) {
      let n = ''
      while (i < src.length && /[0-9.]/.test(src[i])) n += src[i++]
      tokens.push({ type: T.NUMBER, value: Number(n) })
      continue
    }

    // Identifier or keyword
    if (/[A-Za-z_]/.test(src[i])) {
      let id = ''
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) id += src[i++]
      tokens.push({ type: T.IDENT, value: id, keyword: KEYWORDS.has(id) })
      continue
    }

    // Two-char operators
    const two = src.slice(i, i + 2)
    if (two === '==') { tokens.push({ type: T.EQEQ }); i += 2; continue }
    if (two === '!=') { tokens.push({ type: T.NEQ });  i += 2; continue }
    if (two === '<=') { tokens.push({ type: T.LE });   i += 2; continue }
    if (two === '>=') { tokens.push({ type: T.GE });   i += 2; continue }
    if (two === '&&') { tokens.push({ type: T.AND });  i += 2; continue }
    if (two === '||') { tokens.push({ type: T.OR });   i += 2; continue }

    // Single-char operators
    const single = {
      '(': T.LPAREN, ')': T.RPAREN, '{': T.LBRACE, '}': T.RBRACE,
      ';': T.SEMI,   ',': T.COMMA,  '=': T.EQ,     '<': T.LT,
      '>': T.GT,     '+': T.PLUS,   '-': T.MINUS,  '*': T.STAR,
      '/': T.SLASH,  '!': T.NOT
    }
    if (single[src[i]]) { tokens.push({ type: single[src[i]] }); i++; continue }

    // Unknown — skip with warning
    i++
  }

  tokens.push({ type: T.EOF })
  return tokens
}

// ── Parser (recursive descent) ───────────────────────────────────────────────

export function parse (src) {
  const tokens = tokenize(src)
  let pos = 0

  const peek  = ()   => tokens[pos]
  const next  = ()   => tokens[pos++]
  const eat   = (t)  => {
    if (peek().type !== t) throw new SyntaxError(`Expected ${t} but got ${peek().type} at token ${pos}`)
    return next()
  }
  const check = (t)  => peek().type === t
  const checkKw = (k) => peek().type === T.IDENT && peek().value === k

  // ── Expressions ─────────────────────────────────────────────────────────

  function parseExpr () { return parseOr() }

  function parseOr () {
    let left = parseAnd()
    while (check(T.OR)) { next(); left = { type: 'binop', op: '||', left, right: parseAnd() } }
    return left
  }

  function parseAnd () {
    let left = parseEq()
    while (check(T.AND)) { next(); left = { type: 'binop', op: '&&', left, right: parseEq() } }
    return left
  }

  function parseEq () {
    let left = parseCmp()
    while (check(T.EQEQ) || check(T.NEQ)) {
      const op = next().type
      left = { type: 'binop', op, left, right: parseCmp() }
    }
    return left
  }

  function parseCmp () {
    let left = parseAdd()
    while ([T.LT, T.GT, T.LE, T.GE].includes(peek().type)) {
      const op = next().type
      left = { type: 'binop', op, left, right: parseAdd() }
    }
    return left
  }

  function parseAdd () {
    let left = parseMul()
    while (check(T.PLUS) || check(T.MINUS)) {
      const op = next().type
      left = { type: 'binop', op, left, right: parseMul() }
    }
    return left
  }

  function parseMul () {
    let left = parseUnary()
    while (check(T.STAR) || check(T.SLASH)) {
      const op = next().type
      left = { type: 'binop', op, left, right: parseUnary() }
    }
    return left
  }

  function parseUnary () {
    if (check(T.NOT))   { next(); return { type: 'unop', op: '!',   expr: parseUnary() } }
    if (check(T.MINUS)) { next(); return { type: 'unop', op: 'neg', expr: parseUnary() } }
    return parsePrimary()
  }

  function parsePrimary () {
    const tok = peek()

    // Parenthesized expression
    if (check(T.LPAREN)) { next(); const e = parseExpr(); eat(T.RPAREN); return e }

    // String literal
    if (check(T.STRING)) { next(); return { type: 'string', value: tok.value } }

    // Number literal
    if (check(T.NUMBER)) { next(); return { type: 'number', value: tok.value } }

    // Identifier — could be function call or variable
    if (check(T.IDENT) && !tok.keyword) {
      next()
      if (check(T.LPAREN)) {
        // Function call
        eat(T.LPAREN)
        const args = []
        while (!check(T.RPAREN)) {
          args.push(parseExpr())
          if (check(T.COMMA)) next()
        }
        eat(T.RPAREN)
        return { type: 'call', name: tok.value, args }
      }
      return { type: 'ident', name: tok.value }
    }

    throw new SyntaxError(`Unexpected token: ${tok.type} "${tok.value ?? ''}" at position ${pos}`)
  }

  // ── Statements ───────────────────────────────────────────────────────────

  function parseStmt () {
    const tok = peek()

    // if statement
    if (checkKw('if')) {
      next()
      eat(T.LPAREN); const cond = parseExpr(); eat(T.RPAREN)
      eat(T.LBRACE); const then = parseBlock(); eat(T.RBRACE)
      let els = []
      if (checkKw('else')) {
        next()
        eat(T.LBRACE); els = parseBlock(); eat(T.RBRACE)
      }
      return { type: 'if', condition: cond, then: then, else: els }
    }

    // while loop
    if (checkKw('while')) {
      next()
      eat(T.LPAREN); const cond = parseExpr(); eat(T.RPAREN)
      eat(T.LBRACE); const body = parseBlock(); eat(T.RBRACE)
      return { type: 'while', condition: cond, body }
    }

    // Variable declaration: U64 x = expr;
    const typeKeywords = ['U64', 'I64', 'U8', 'F64', 'Bool', 'U0']
    if (check(T.IDENT) && typeKeywords.includes(tok.value)) {
      next()
      const name = eat(T.IDENT).value
      let value = { type: 'number', value: 0 }
      if (check(T.EQ)) { next(); value = parseExpr() }
      eat(T.SEMI)
      return { type: 'declare', varType: tok.value, name, value }
    }

    // Bare string statement: "text\n"; — HolyC print shorthand
    if (check(T.STRING)) {
      const s = next().value
      eat(T.SEMI)
      return { type: 'print_stmt', value: { type: 'string', value: s } }
    }

    // Expression statement (assignment or function call)
    const expr = parseExpr()

    // Assignment: x = expr;
    if (check(T.EQ) && expr.type === 'ident') {
      next()
      const value = parseExpr()
      eat(T.SEMI)
      return { type: 'assign', name: expr.name, value }
    }

    eat(T.SEMI)
    return { type: 'expr_stmt', expr }
  }

  function parseBlock () {
    const stmts = []
    while (!check(T.RBRACE) && !check(T.EOF)) {
      stmts.push(parseStmt())
    }
    return stmts
  }

  // ── Program ──────────────────────────────────────────────────────────────

  const body = []
  while (!check(T.EOF)) body.push(parseStmt())
  return { type: 'program', body }
}
