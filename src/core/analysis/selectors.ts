import type { QState } from '../sim/state';
import { reducedDensity } from './density';
import { qubitDerived, statevectorRows, type QubitDerived, type StatevectorRow } from './formats';
import { entanglementGraph, type EntanglementEdge } from './entanglement';

/**
 * Memoized, framework-agnostic selectors keyed by QState identity.
 * A Snapshot's `state` is immutable once produced (see debug/interpreter.ts), so caching by
 * object identity is safe: the same snapshot always yields the same derived values.
 */
const qubitCache = new WeakMap<QState, Map<number, QubitDerived>>();
const entCache = new WeakMap<QState, EntanglementEdge[]>();
const svCache = new WeakMap<QState, StatevectorRow[]>();

export function getQubitDerived(state: QState, qubit: number): QubitDerived {
  let byQubit = qubitCache.get(state);
  if (!byQubit) { byQubit = new Map(); qubitCache.set(state, byQubit); }
  let cached = byQubit.get(qubit);
  if (!cached) {
    cached = qubitDerived(reducedDensity(state, qubit));
    byQubit.set(qubit, cached);
  }
  return cached;
}

export function getEntanglementGraph(state: QState, threshold = 0.02): EntanglementEdge[] {
  const cached = entCache.get(state);
  if (cached) return cached;
  const graph = entanglementGraph(state, threshold);
  entCache.set(state, graph);
  return graph;
}

export function getStatevectorRows(state: QState): StatevectorRow[] {
  const cached = svCache.get(state);
  if (cached) return cached;
  const rows = statevectorRows(state);
  svCache.set(state, rows);
  return rows;
}
