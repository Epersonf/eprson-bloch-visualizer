import type { QState } from '../sim/state';
import type { Mat2, Complex } from '../gates/matrices';
import { c } from '../gates/matrices';

/** rho = [[rho00, rho01],[rho10, rho11]], rho10 = conj(rho01). O(2^n), no global density matrix built. */
export function reducedDensity(s: QState, k: number): Mat2 {
  const mask = 1 << k;
  let r00 = 0, r11 = 0, r01re = 0, r01im = 0;
  for (let i = 0; i < s.re.length; i++) {
    if (i & mask) { r11 += s.re[i] ** 2 + s.im[i] ** 2; continue; }
    const j = i | mask;
    r00 += s.re[i] ** 2 + s.im[i] ** 2;
    // <i|rho|j> = a_i . conj(a_j)
    r01re += s.re[i] * s.re[j] + s.im[i] * s.im[j];
    r01im += s.im[i] * s.re[j] - s.re[i] * s.im[j];
  }
  return {
    a: c(r00), b: c(r01re, r01im),
    c: c(r01re, -r01im), d: c(r11),
  };
}

export type ComplexMat = Complex[][];

/** General reduced density matrix over an arbitrary subset of qubits (traces out the rest). O(2^n). */
export function reducedDensityMulti(s: QState, qubits: number[]): ComplexMat {
  const k = qubits.length;
  const dim = 1 << k;
  const keptMask = qubits.reduce((acc, qb) => acc | (1 << qb), 0);
  const buckets = new Map<number, { re: Float64Array; im: Float64Array }>();

  for (let i = 0; i < s.re.length; i++) {
    const otherKey = i & ~keptMask;
    let a = 0;
    for (let idx = 0; idx < qubits.length; idx++) {
      if ((i >> qubits[idx]) & 1) a |= 1 << idx;
    }
    let bucket = buckets.get(otherKey);
    if (!bucket) {
      bucket = { re: new Float64Array(dim), im: new Float64Array(dim) };
      buckets.set(otherKey, bucket);
    }
    bucket.re[a] = s.re[i];
    bucket.im[a] = s.im[i];
  }

  const rho: ComplexMat = Array.from({ length: dim }, () => Array.from({ length: dim }, () => c(0)));
  for (const bucket of buckets.values()) {
    for (let a = 0; a < dim; a++) {
      for (let b = 0; b < dim; b++) {
        rho[a][b].re += bucket.re[a] * bucket.re[b] + bucket.im[a] * bucket.im[b];
        rho[a][b].im += bucket.im[a] * bucket.re[b] - bucket.re[a] * bucket.im[b];
      }
    }
  }
  return rho;
}
