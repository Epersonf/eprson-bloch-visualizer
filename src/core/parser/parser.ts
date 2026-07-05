import { tokenizeLine, type Token } from './tokenizer';
import type { ParseError } from './errors';
import type { Instruction, ParsedProgram, GateInstruction } from './ast';
import { GATE_REGISTRY, isGateName, suggestGateName, type GateName } from '../gates/registry';

export type ParseResult =
  | { ok: true; program: ParsedProgram; warnings: ParseError[] }
  | { ok: false; errors: ParseError[] };

class LineParser {
  tokens: Token[];
  pos = 0;
  line: number;
  constructor(tokens: Token[], line: number) {
    this.tokens = tokens;
    this.line = line;
  }
  peek(): Token { return this.tokens[this.pos]; }
  next(): Token { return this.tokens[this.pos++]; }
  at(type: Token['type']): boolean { return this.peek().type === type; }
  err(message: string, hint?: string): ParseError {
    return { line: this.line, col: this.peek().col, message, hint, severity: 'error' };
  }
}

function parseQubitRef(p: LineParser): number | ParseError {
  const t = p.peek();
  if (t.type !== 'IDENT' || !/^q\d+$/i.test(t.value)) {
    return p.err(`esperado referência de qubit (ex: q0), encontrado "${t.value || 'fim de linha'}"`);
  }
  p.next();
  return parseInt(t.value.slice(1), 10);
}

function parseBitRef(p: LineParser): number | ParseError {
  const t = p.peek();
  if (t.type !== 'IDENT' || !/^c\d+$/i.test(t.value)) {
    return p.err(`esperado referência de bit clássico (ex: c0), encontrado "${t.value || 'fim de linha'}"`);
  }
  p.next();
  return parseInt(t.value.slice(1), 10);
}

function isErr(x: unknown): x is ParseError {
  return typeof x === 'object' && x !== null && 'message' in x && 'severity' in x;
}

/** angle = float | float "*pi" | "pi/" integer | "pi" | "-pi" ... */
function parseAngle(p: LineParser): number | ParseError {
  let sign = 1;
  if (p.at('MINUS')) { sign = -1; p.next(); }

  let num = 1;
  let isPi = false;

  if (p.at('NUMBER')) {
    num = parseFloat(p.next().value);
    if (p.at('STAR')) {
      p.next();
      const id = p.peek();
      if (id.type !== 'IDENT' || id.value.toLowerCase() !== 'pi') {
        return p.err(`esperado "pi" após "*"`, 'sintaxe de ângulo: 3*pi/4');
      }
      p.next();
      isPi = true;
    }
  } else if (p.at('IDENT') && p.peek().value.toLowerCase() === 'pi') {
    p.next();
    isPi = true;
  } else {
    return p.err(`esperado um ângulo (número ou expressão com pi)`, '0.9, pi/2, 3*pi/4, -pi');
  }

  let denom = 1;
  if (p.at('SLASH')) {
    p.next();
    if (!p.at('NUMBER')) return p.err(`esperado inteiro após "/"`);
    denom = parseFloat(p.next().value);
  }

  return (sign * num * (isPi ? Math.PI : 1)) / denom;
}

export function parseProgram(source: string): ParseResult {
  const rawLines = source.split(/\r\n|\n/);
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const instructions: Instruction[] = [];
  const labels: Record<string, number> = {};

  let numQubits = 0;
  let numBits = 0;
  let declaredQubits = false;
  let declaredBits = false;
  const measuredWithoutReset = new Set<number>();
  const everMeasuredBits = new Set<number>();

  for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
    const lineNo = lineIdx + 1;
    const raw = rawLines[lineIdx];
    let tokens = tokenizeLine(raw);
    if (tokens.length === 1) continue; // blank / comment-only line (just EOF)

    let label: string | undefined;
    // label: identifier ":" — only when followed by COLON
    if (tokens[0].type === 'IDENT' && tokens[1]?.type === 'COLON') {
      label = tokens[0].value;
      tokens = tokens.slice(2);
      if (tokens.length === 1) { // label with no instruction on the line
        labels[label] = lineNo;
        continue;
      }
    }

    const p = new LineParser(tokens, lineNo);
    if (label) labels[label] = lineNo;

    const head = p.peek();
    if (head.type !== 'IDENT') {
      errors.push(p.err(`token inesperado "${head.value}"`));
      continue;
    }
    const keyword = head.value.toUpperCase();

    if (keyword === 'QUBITS') {
      p.next();
      if (!p.at('NUMBER')) { errors.push(p.err('esperado número de qubits, ex: qubits 3')); continue; }
      numQubits = parseInt(p.next().value, 10);
      declaredQubits = true;
      instructions.push({ kind: 'decl-qubits', n: numQubits, line: lineNo });
      continue;
    }

    if (keyword === 'BITS') {
      p.next();
      if (!p.at('NUMBER')) { errors.push(p.err('esperado número de bits, ex: bits 2')); continue; }
      numBits = parseInt(p.next().value, 10);
      declaredBits = true;
      instructions.push({ kind: 'decl-bits', n: numBits, line: lineNo });
      continue;
    }

    if (keyword === 'MEASURE') {
      p.next();
      if (!p.at('LPAREN')) { errors.push(p.err('esperado "(" após MEASURE')); continue; }
      p.next();
      const qb = parseQubitRef(p);
      if (isErr(qb)) { errors.push(qb); continue; }
      if (!p.at('ARROW')) { errors.push(p.err('esperado "->" em MEASURE(qN -> cN)')); continue; }
      p.next();
      const bit = parseBitRef(p);
      if (isErr(bit)) { errors.push(bit); continue; }
      if (!p.at('RPAREN')) { errors.push(p.err('esperado ")" ao final de MEASURE')); continue; }
      p.next();
      if (declaredQubits && qb >= numQubits) errors.push(p.err(`qubit q${qb} fora do range declarado (qubits ${numQubits})`));
      if (declaredBits && bit >= numBits) errors.push(p.err(`bit c${bit} fora do range declarado (bits ${numBits})`));
      instructions.push({ kind: 'measure', qubit: qb, bit, line: lineNo, label });
      measuredWithoutReset.add(qb);
      everMeasuredBits.add(bit);
      continue;
    }

    if (keyword === 'RESET') {
      p.next();
      if (!p.at('LPAREN')) { errors.push(p.err('esperado "(" após RESET')); continue; }
      p.next();
      const qb = parseQubitRef(p);
      if (isErr(qb)) { errors.push(qb); continue; }
      if (!p.at('RPAREN')) { errors.push(p.err('esperado ")" ao final de RESET')); continue; }
      p.next();
      if (declaredQubits && qb >= numQubits) errors.push(p.err(`qubit q${qb} fora do range declarado (qubits ${numQubits})`));
      instructions.push({ kind: 'reset', qubit: qb, line: lineNo, label });
      measuredWithoutReset.delete(qb);
      continue;
    }

    if (keyword === 'BARRIER') {
      p.next();
      const qubits: number[] = [];
      if (p.at('LPAREN')) {
        p.next();
        while (!p.at('RPAREN') && !p.at('EOF')) {
          const qb = parseQubitRef(p);
          if (isErr(qb)) { errors.push(qb); break; }
          qubits.push(qb);
          if (p.at('COMMA')) p.next(); else break;
        }
        if (!p.at('RPAREN')) { errors.push(p.err('esperado ")" ao final de BARRIER')); continue; }
        p.next();
      }
      instructions.push({ kind: 'barrier', qubits: qubits.length ? qubits : undefined, line: lineNo, label });
      continue;
    }

    if (keyword === 'IF') {
      p.next();
      if (!p.at('LPAREN')) { errors.push(p.err('esperado "(" após IF')); continue; }
      p.next();
      const bit = parseBitRef(p);
      if (isErr(bit)) { errors.push(bit); continue; }
      if (!p.at('EQEQ')) { errors.push(p.err('esperado "==" em IF (cN == 0|1)')); continue; }
      p.next();
      if (!p.at('NUMBER')) { errors.push(p.err('esperado 0 ou 1 em IF (cN == 0|1)')); continue; }
      const valTok = p.next();
      if (valTok.value !== '0' && valTok.value !== '1') { errors.push(p.err('valor de IF deve ser 0 ou 1')); continue; }
      const value = (valTok.value === '1' ? 1 : 0) as 0 | 1;
      if (!p.at('RPAREN')) { errors.push(p.err('esperado ")" ao final da condição IF')); continue; }
      p.next();
      if (!everMeasuredBits.has(bit)) {
        warnings.push({ line: lineNo, col: 0, message: `IF referencia c${bit}, que ainda não foi medido`, severity: 'warning' });
      }
      const inner = parseGateCall(p, lineNo, errors, declaredQubits, numQubits, measuredWithoutReset, warnings);
      if (!inner) continue;
      instructions.push({ kind: 'cond', bit, value, inner, line: lineNo, label });
      continue;
    }

    // otherwise: gate call
    const gate = parseGateCall(p, lineNo, errors, declaredQubits, numQubits, measuredWithoutReset, warnings);
    if (gate) { gate.label = label; instructions.push(gate); }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    warnings,
    program: { instructions, numQubits, numBits, labels },
  };
}

function parseGateCall(
  p: LineParser,
  lineNo: number,
  errors: ParseError[],
  declaredQubits: boolean,
  numQubits: number,
  measuredWithoutReset: Set<number>,
  warnings: ParseError[],
): GateInstruction | null {
  const head = p.peek();
  if (head.type !== 'IDENT') {
    errors.push(p.err(`token inesperado "${head.value}"`));
    return null;
  }
  const upper = head.value.toUpperCase();
  if (!isGateName(upper)) {
    const suggestion = suggestGateName(upper);
    errors.push(p.err(
      `gate desconhecido "${head.value}"`,
      suggestion ? `você quis dizer ${suggestion}?` : undefined,
    ));
    return null;
  }
  const gateName = upper as GateName;
  const def = GATE_REGISTRY[gateName];
  p.next();

  if (!p.at('LPAREN')) { errors.push(p.err(`esperado "(" após ${gateName}`)); return null; }
  p.next();

  const qubits: number[] = [];
  const params: number[] = [];

  // qubit refs first
  for (let i = 0; i < def.numQubits; i++) {
    const qb = parseQubitRef(p);
    if (isErr(qb)) { errors.push(qb); return null; }
    if (declaredQubits && qb >= numQubits) {
      errors.push({ line: lineNo, col: p.peek().col, message: `qubit q${qb} fora do range declarado (qubits ${numQubits})`, severity: 'error' });
    }
    qubits.push(qb);
    if (i < def.numQubits - 1 || def.numParams > 0) {
      if (!p.at('COMMA')) { errors.push(p.err(`esperado "," — ${gateName} espera ${def.numQubits} qubit(s) e ${def.numParams} parâmetro(s)`)); return null; }
      p.next();
    }
  }

  for (let i = 0; i < def.numParams; i++) {
    const val = parseAngle(p);
    if (isErr(val)) { errors.push(val); return null; }
    params.push(val);
    if (i < def.numParams - 1) {
      if (!p.at('COMMA')) { errors.push(p.err(`esperado ","`)); return null; }
      p.next();
    }
  }

  if (!p.at('RPAREN')) {
    errors.push(p.err(`esperado ")" — aridade incorreta para ${gateName} (espera ${def.numQubits} qubit(s), ${def.numParams} parâmetro(s))`));
    return null;
  }
  p.next();

  for (const qb of qubits) {
    if (measuredWithoutReset.has(qb)) {
      warnings.push({ line: lineNo, col: 0, message: `q${qb} usado após MEASURE sem RESET`, severity: 'warning' });
    }
  }

  return { kind: 'gate', gate: gateName, qubits, params, line: lineNo };
}
