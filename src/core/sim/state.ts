export interface QState {
  n: number; // number of qubits
  re: Float64Array; // length 2^n
  im: Float64Array; // length 2^n
}

export function initState(n: number): QState {
  const size = 1 << n;
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  re[0] = 1; // |00...0>
  return { n, re, im };
}

export function cloneState(s: QState): QState {
  return { n: s.n, re: s.re.slice(), im: s.im.slice() };
}
