import type { QState } from './state';

export function probabilityOf1(s: QState, k: number): number {
  const mask = 1 << k;
  let p1 = 0;
  for (let i = 0; i < s.re.length; i++) {
    if (i & mask) p1 += s.re[i] * s.re[i] + s.im[i] * s.im[i];
  }
  return p1;
}

function collapse(s: QState, k: number, outcome: 0 | 1, p1: number): void {
  const mask = 1 << k;
  const norm = Math.sqrt(outcome ? p1 : 1 - p1);
  for (let i = 0; i < s.re.length; i++) {
    const bit = (i & mask) ? 1 : 0;
    if (bit !== outcome) { s.re[i] = 0; s.im[i] = 0; }
    else if (norm > 0) { s.re[i] /= norm; s.im[i] /= norm; }
  }
}

/** Samples a measurement outcome via `rng`, collapses the state in-place, returns the outcome. */
export function measure(s: QState, k: number, rng: () => number): 0 | 1 {
  const p1 = probabilityOf1(s, k);
  const outcome: 0 | 1 = rng() < p1 ? 1 : 0;
  collapse(s, k, outcome, p1);
  return outcome;
}

/** Forces a specific outcome (ASK / FIXED measurement modes), bypassing the RNG. Returns the branch probability it had. */
export function forceMeasure(s: QState, k: number, outcome: 0 | 1): { pWas: number } {
  const p1 = probabilityOf1(s, k);
  collapse(s, k, outcome, p1);
  return { pWas: outcome ? p1 : 1 - p1 };
}

/** Projects and reinitializes a qubit to |0> (RESET instruction). */
export function reset(s: QState, k: number, rng: () => number): void {
  const p1 = probabilityOf1(s, k);
  const outcome: 0 | 1 = rng() < p1 ? 1 : 0;
  collapse(s, k, outcome, p1);
  if (outcome === 1) {
    // apply an X on k to bring the collapsed |1> branch back to |0>
    const mask = 1 << k;
    for (let i = 0; i < s.re.length; i++) {
      if (!(i & mask)) continue;
      const j = i & ~mask;
      s.re[j] = s.re[i]; s.im[j] = s.im[i];
      s.re[i] = 0; s.im[i] = 0;
    }
  }
}
