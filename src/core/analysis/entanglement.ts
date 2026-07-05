import type { QState } from '../sim/state';
import { c } from '../gates/matrices';
import { reducedDensityMulti, type ComplexMat } from './density';
import { conjElementwise, kron, matmul, characteristicPolynomial, polyRoots } from './linalg';

const Y2: ComplexMat = [
  [c(0), c(0, -1)],
  [c(0, 1), c(0)],
];
const YY = kron(Y2, Y2);

/** Wootters concurrence for the reduced 2-qubit density matrix of qubits (i,j). 0 = separable, 1 = maximally entangled pair. */
export function concurrence(s: QState, i: number, j: number): number {
  const rho = reducedDensityMulti(s, [i, j]);
  const rhoTilde = matmul(YY, matmul(conjElementwise(rho), YY));
  const R = matmul(rho, rhoTilde);
  const coeffs = characteristicPolynomial(R);
  const roots = polyRoots(coeffs);
  const lambdas = roots
    .map((r) => Math.max(0, r.re))
    .sort((a, b) => b - a);
  const sqrts = lambdas.map((l) => Math.sqrt(l));
  const c_ = sqrts[0] - sqrts[1] - sqrts[2] - sqrts[3];
  return Math.max(0, Math.min(1, c_));
}

export interface EntanglementEdge { a: number; b: number; concurrence: number; }

/** All pairwise concurrences above the drawing threshold (0.02, per design doc). */
export function entanglementGraph(s: QState, threshold = 0.02): EntanglementEdge[] {
  const edges: EntanglementEdge[] = [];
  for (let i = 0; i < s.n; i++) {
    for (let j = i + 1; j < s.n; j++) {
      const cval = concurrence(s, i, j);
      if (cval >= threshold) edges.push({ a: i, b: j, concurrence: cval });
    }
  }
  return edges;
}
