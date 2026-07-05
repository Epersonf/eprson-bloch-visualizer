export interface ParseError {
  line: number;
  col: number;
  message: string;
  hint?: string;
  severity: 'error' | 'warning';
}

export function isParseErrorArray(x: unknown): x is ParseError[] {
  return Array.isArray(x) && (x.length === 0 || (typeof x[0] === 'object' && x[0] !== null && 'message' in (x[0] as object)));
}
