import { initState, cloneState, type QState } from '../sim/state';
import { applyGate1, applyControlled1, applySwap, applyControlledSwap } from '../sim/apply';
import { probabilityOf1, forceMeasure, reset as resetQubit } from '../sim/measure';
import { mulberry32 } from '../sim/rng';
import { GATE_REGISTRY } from '../gates/registry';
import type { GateInstruction, Instruction } from '../parser/ast';

export interface LastOutcome {
  qubit: number;
  bit: number;
  value: 0 | 1;
  pWas: number;
}

export interface Snapshot {
  state: QState; // immutable once produced
  bits: (0 | 1 | null)[];
  pc: number; // index into the runtime instruction list (excludes decl-* )
  rngState: number;
  lastOutcome?: LastOutcome;
}

export type MeasurementMode = 'SAMPLE' | 'ASK' | { fixed: (0 | 1)[] };

/** decl-qubits / decl-bits configure the machine once at load; everything else is stepped through. */
export function runtimeInstructions(program: Instruction[]): Instruction[] {
  return program.filter((i) => i.kind !== 'decl-qubits' && i.kind !== 'decl-bits');
}

export function createInitialSnapshot(numQubits: number, numBits: number, seed: number): Snapshot {
  return {
    state: initState(numQubits),
    bits: new Array(numBits).fill(null) as (0 | 1 | null)[],
    pc: 0,
    rngState: seed >>> 0,
  };
}

export function cloneSnapshot(s: Snapshot): Snapshot {
  return {
    state: cloneState(s.state),
    bits: s.bits.slice(),
    pc: s.pc,
    rngState: s.rngState,
    lastOutcome: s.lastOutcome,
  };
}

export function applyGateInstruction(state: QState, instr: GateInstruction): void {
  const def = GATE_REGISTRY[instr.gate];
  const U = def.matrix(instr.params);
  if (def.kind === 'single') {
    applyGate1(state, instr.qubits[0], U);
  } else if (def.kind === 'controlled') {
    const controls = instr.qubits.slice(0, def.numControls);
    const target = instr.qubits[def.numControls];
    applyControlled1(state, controls, target, U);
  } else if (def.kind === 'swap') {
    applySwap(state, instr.qubits[0], instr.qubits[1]);
  } else if (def.kind === 'cswap') {
    const controls = instr.qubits.slice(0, def.numControls);
    applyControlledSwap(state, controls, instr.qubits[def.numControls], instr.qubits[def.numControls + 1]);
  }
}

export interface MeasurementRequest { qubit: number; bit: number; p1: number; }

export function measurementRequest(state: QState, instr: { qubit: number; bit: number }): MeasurementRequest {
  return { qubit: instr.qubit, bit: instr.bit, p1: probabilityOf1(state, instr.qubit) };
}

export function countPriorMeasurements(instructions: Instruction[], uptoIndex: number): number {
  let n = 0;
  for (let i = 0; i < uptoIndex; i++) if (instructions[i].kind === 'measure') n++;
  return n;
}

/** Executes one non-measurement runtime instruction (gate / cond / reset / barrier) against a fresh clone of `from`. */
export function stepNonMeasure(from: Snapshot, instr: Instruction): Snapshot {
  const snap = cloneSnapshot(from);
  snap.lastOutcome = undefined;
  snap.pc = from.pc + 1;

  if (instr.kind === 'gate') {
    applyGateInstruction(snap.state, instr);
  } else if (instr.kind === 'cond') {
    if (snap.bits[instr.bit] === instr.value) applyGateInstruction(snap.state, instr.inner);
  } else if (instr.kind === 'reset') {
    const rng = mulberry32(snap.rngState);
    resetQubit(snap.state, instr.qubit, () => rng.next());
    snap.rngState = rng.state;
  } else if (instr.kind === 'barrier') {
    // no-op, visual only
  }
  return snap;
}

/** Resolves a pending measurement with a concrete outcome (from SAMPLE's own RNG draw, ASK's user choice, or FIXED script). */
export function stepMeasure(from: Snapshot, instr: { qubit: number; bit: number }, outcome: 0 | 1): Snapshot {
  const snap = cloneSnapshot(from);
  snap.pc = from.pc + 1;
  const { pWas } = forceMeasure(snap.state, instr.qubit, outcome);
  snap.bits[instr.bit] = outcome;
  snap.lastOutcome = { qubit: instr.qubit, bit: instr.bit, value: outcome, pWas };
  return snap;
}

/** Samples an outcome deterministically from the snapshot's RNG stream (SAMPLE mode), returning it plus the advanced rngState. */
export function sampleOutcome(from: Snapshot, p1: number): { outcome: 0 | 1; rngState: number } {
  const rng = mulberry32(from.rngState);
  const outcome: 0 | 1 = rng.next() < p1 ? 1 : 0;
  return { outcome, rngState: rng.state };
}
