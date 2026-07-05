import type { GateName } from '../gates/registry';

export interface GateInstruction {
  kind: 'gate';
  gate: GateName;
  qubits: number[];
  params: number[];
  line: number;
  label?: string;
}

export type Instruction =
  | { kind: 'decl-qubits'; n: number; line: number }
  | { kind: 'decl-bits'; n: number; line: number }
  | GateInstruction
  | { kind: 'measure'; qubit: number; bit: number; line: number; label?: string }
  | { kind: 'reset'; qubit: number; line: number; label?: string }
  | { kind: 'barrier'; qubits?: number[]; line: number; label?: string }
  | { kind: 'cond'; bit: number; value: 0 | 1; inner: GateInstruction; line: number; label?: string };

export interface ParsedProgram {
  instructions: Instruction[];
  numQubits: number;
  numBits: number;
  /** map from label name -> line number, for named breakpoints */
  labels: Record<string, number>;
}
