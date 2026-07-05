import { describe, it, expect } from 'vitest';
import { initState } from '../sim/state';
import { applyGate1, applyControlled1 } from '../sim/apply';
import { H_MAT, X_MAT } from '../gates/matrices';
import { reducedDensity } from '../analysis/density';
import { blochVector, blochLength, entanglementEntropy } from '../analysis/bloch';
import { concurrence } from '../analysis/entanglement';

function bellState() {
  const s = initState(2);
  applyGate1(s, 0, H_MAT);
  applyControlled1(s, [0], 1, X_MAT);
  return s;
}

function ghzState(n: number) {
  const s = initState(n);
  applyGate1(s, 0, H_MAT);
  for (let k = 1; k < n; k++) applyControlled1(s, [k - 1], k, X_MAT);
  return s;
}

describe('analysis: Bell state', () => {
  const s = bellState();
  it('has |r|=0 for each qubit (maximally mixed reduced state)', () => {
    for (const q of [0, 1]) {
      const r = blochVector(reducedDensity(s, q));
      expect(blochLength(r)).toBeCloseTo(0, 6);
    }
  });
  it('has concurrence C=1 between the pair', () => {
    expect(concurrence(s, 0, 1)).toBeCloseTo(1, 3);
  });
});

describe('analysis: product state', () => {
  const s = initState(2);
  applyGate1(s, 0, X_MAT); // |10>, a plain product state, no entanglement

  it('has concurrence C=0', () => {
    expect(concurrence(s, 0, 1)).toBeCloseTo(0, 6);
  });
  it('has |r|=1 for each qubit (pure, unentangled)', () => {
    for (const q of [0, 1]) {
      const r = blochVector(reducedDensity(s, q));
      expect(blochLength(r)).toBeCloseTo(1, 6);
    }
  });
});

describe('analysis: GHZ state', () => {
  const s = ghzState(3);
  it('has entanglement entropy S=1 per qubit', () => {
    for (let q = 0; q < 3; q++) {
      const r = blochVector(reducedDensity(s, q));
      expect(entanglementEntropy(r)).toBeCloseTo(1, 3);
    }
  });
  it('has concurrence C=0 for every pair (genuinely tripartite entanglement)', () => {
    expect(concurrence(s, 0, 1)).toBeCloseTo(0, 3);
    expect(concurrence(s, 1, 2)).toBeCloseTo(0, 3);
    expect(concurrence(s, 0, 2)).toBeCloseTo(0, 3);
  });
});
