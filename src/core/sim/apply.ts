import type { QState } from './state';
import type { Mat2 } from '../gates/matrices';

/** Applies a 1-qubit unitary U to qubit k of the state, in-place. O(2^n). */
export function applyGate1(s: QState, k: number, U: Mat2): void {
  const mask = 1 << k;
  const size = 1 << s.n;
  for (let i = 0; i < size; i++) {
    if (i & mask) continue; // visit each pair once
    const j = i | mask;
    const r0 = s.re[i], i0 = s.im[i];
    const r1 = s.re[j], i1 = s.im[j];
    s.re[i] = U.a.re * r0 - U.a.im * i0 + U.b.re * r1 - U.b.im * i1;
    s.im[i] = U.a.re * i0 + U.a.im * r0 + U.b.re * i1 + U.b.im * r1;
    s.re[j] = U.c.re * r0 - U.c.im * i0 + U.d.re * r1 - U.d.im * i1;
    s.im[j] = U.c.re * i0 + U.c.im * r0 + U.d.re * i1 + U.d.im * r1;
  }
}

/** Applies U to target qubit t, only where every bit in controls is 1. */
export function applyControlled1(s: QState, controls: number[], t: number, U: Mat2): void {
  const tMask = 1 << t;
  const cMask = controls.reduce((acc, c) => acc | (1 << c), 0);
  const size = 1 << s.n;
  for (let i = 0; i < size; i++) {
    if (i & tMask) continue;
    if ((i & cMask) !== cMask) continue; // controls not all 1
    const j = i | tMask;
    const r0 = s.re[i], i0 = s.im[i];
    const r1 = s.re[j], i1 = s.im[j];
    s.re[i] = U.a.re * r0 - U.a.im * i0 + U.b.re * r1 - U.b.im * i1;
    s.im[i] = U.a.re * i0 + U.a.im * r0 + U.b.re * i1 + U.b.im * r1;
    s.re[j] = U.c.re * r0 - U.c.im * i0 + U.d.re * r1 - U.d.im * i1;
    s.im[j] = U.c.re * i0 + U.c.im * r0 + U.d.re * i1 + U.d.im * r1;
  }
}

/** Unconditional SWAP of qubits a and b. */
export function applySwap(s: QState, a: number, b: number): void {
  const maskA = 1 << a;
  const maskB = 1 << b;
  const size = 1 << s.n;
  for (let i = 0; i < size; i++) {
    const bitA = (i & maskA) ? 1 : 0;
    const bitB = (i & maskB) ? 1 : 0;
    if (bitA === bitB) continue;
    const j = (i & ~maskA & ~maskB) | (bitA << b) | (bitB << a);
    if (j <= i) continue; // swap each differing pair once
    const tr = s.re[i]; s.re[i] = s.re[j]; s.re[j] = tr;
    const ti = s.im[i]; s.im[i] = s.im[j]; s.im[j] = ti;
  }
}

/** SWAP of qubits a and b, gated on `controls` all being 1. */
export function applyControlledSwap(s: QState, controls: number[], a: number, b: number): void {
  const maskA = 1 << a;
  const maskB = 1 << b;
  const cMask = controls.reduce((acc, c) => acc | (1 << c), 0);
  const size = 1 << s.n;
  for (let i = 0; i < size; i++) {
    if ((i & cMask) !== cMask) continue;
    const bitA = (i & maskA) ? 1 : 0;
    const bitB = (i & maskB) ? 1 : 0;
    if (bitA === bitB) continue;
    const j = (i & ~maskA & ~maskB) | (bitA << b) | (bitB << a);
    if (j <= i) continue;
    const tr = s.re[i]; s.re[i] = s.re[j]; s.re[j] = tr;
    const ti = s.im[i]; s.im[i] = s.im[j]; s.im[j] = ti;
  }
}
