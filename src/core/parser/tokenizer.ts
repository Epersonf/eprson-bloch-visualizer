export type TokenType =
  | 'IDENT' | 'NUMBER' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'COLON'
  | 'ARROW' | 'EQEQ' | 'MINUS' | 'STAR' | 'SLASH' | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  col: number; // 0-indexed
}

const SYMBOLS: Array<[string, TokenType]> = [
  ['->', 'ARROW'],
  ['==', 'EQEQ'],
  ['(', 'LPAREN'],
  [')', 'RPAREN'],
  [',', 'COMMA'],
  [':', 'COLON'],
  ['-', 'MINUS'],
  ['*', 'STAR'],
  ['/', 'SLASH'],
];

/** Strips a trailing "# comment" from a raw line, respecting no string literals (QIR has none). */
export function stripComment(line: string): string {
  const idx = line.indexOf('#');
  return idx === -1 ? line : line.slice(0, idx);
}

export function tokenizeLine(rawLine: string): Token[] {
  const line = stripComment(rawLine);
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ type: 'NUMBER', value: line.slice(i, j), col: i });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      tokens.push({ type: 'IDENT', value: line.slice(i, j), col: i });
      i = j;
      continue;
    }

    let matched = false;
    for (const [sym, type] of SYMBOLS) {
      if (line.startsWith(sym, i)) {
        tokens.push({ type, value: sym, col: i });
        i += sym.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: 'IDENT', value: ch, col: i }); // unknown char, let parser flag it
      i++;
    }
  }
  tokens.push({ type: 'EOF', value: '', col: line.length });
  return tokens;
}
