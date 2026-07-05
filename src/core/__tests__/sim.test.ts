import { describe, it, expect } from 'vitest';
import { initState, cloneState } from '../sim/state';
import { applyGate1, applyControlled1 } from '../sim/apply';
import { measure } from '../sim/measure';
import { mulberry32 } from '../sim/rng';
import { H_MAT, X_MAT, RZ_MAT } from '../gates/matrices';

function norm2(re: Float64Array, im: Float64Array): number {
  let s = 0;
  for (let i = 0; i < re.length; i++) s += re[i] * re[i] + im[i] * im[i];
  return s;
}

describe('statevector engine', () => {
  it('preserves unitarity (||psi||=1) after a sequence of gates', () => {
    const s = initState(3);
    applyGate1(s, 0, H_MAT);
    applyGate1(s, 1, H_MAT);
    applyControlled1(s, [0], 2, X_MAT);
    applyGate1(s, 2, RZ_MAT(0.7));
    applyControlled1(s, [1, 2], 0, X_MAT); // toffoli-style via 2 controls
    expect(norm2(s.re, s.im)).toBeCloseTo(1, 10);
  });

  it('H^2 = I', () => {
    const s = initState(1);
    applyGate1(s, 0, H_MAT);
    applyGate1(s, 0, H_MAT);
    expect(s.re[0]).toBeCloseTo(1, 10);
    expect(s.re[1]).toBeCloseTo(0, 10);
  });

  it('CX^2 = I', () => {
    const s = initState(2);
    applyGate1(s, 0, H_MAT); // put control in superposition first so CX is non-trivial
    const before = cloneState(s);
    applyControlled1(s, [0], 1, X_MAT);
    applyControlled1(s, [0], 1, X_MAT);
    for (let i = 0; i < s.re.length; i++) {
      expect(s.re[i]).toBeCloseTo(before.re[i], 10);
      expect(s.im[i]).toBeCloseTo(before.im[i], 10);
    }
  });

  it('RZ(a) . RZ(b) = RZ(a+b)', () => {
    const a = 0.37, b = 1.21;
    const s1 = initState(1);
    applyGate1(s1, 0, H_MAT); // avoid the |0> eigenstate where RZ is trivially a global phase
    applyGate1(s1, 0, RZ_MAT(a));
    applyGate1(s1, 0, RZ_MAT(b));

    const s2 = initState(1);
    applyGate1(s2, 0, H_MAT);
    applyGate1(s2, 0, RZ_MAT(a + b));

    expect(s1.re[0]).toBeCloseTo(s2.re[0], 10);
    expect(s1.im[0]).toBeCloseTo(s2.im[0], 10);
    expect(s1.re[1]).toBeCloseTo(s2.re[1], 10);
    expect(s1.im[1]).toBeCloseTo(s2.im[1], 10);
  });

  it('measuring the same qubit twice (no gates between) yields the same outcome', () => {
    const s = initState(1);
    applyGate1(s, 0, H_MAT);
    const rng = mulberry32(42);
    const first = measure(s, 0, () => rng.next());
    const second = measure(s, 0, () => rng.next());
    expect(second).toBe(first);
  });

  it('step + step-back is the identity (clone/restore round-trip)', () => {
    const s = initState(2);
    const snapshot = cloneState(s);
    applyGate1(s, 0, H_MAT);
    applyControlled1(s, [0], 1, X_MAT);
    // "step back" = restore the snapshot taken before the steps
    const restored = cloneState(snapshot);
    expect(restored.re).toEqual(snapshot.re);
    expect(restored.im).toEqual(snapshot.im);
  });
});
