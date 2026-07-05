import type { Instruction } from '../parser/ast';
import { GATE_REGISTRY } from '../gates/registry';

export function instructionToQiskit(instr: Instruction): string | null {
  switch (instr.kind) {
    case 'decl-qubits':
    case 'decl-bits':
      return null;
    case 'gate':
      return GATE_REGISTRY[instr.gate].qiskit(instr.qubits, instr.params);
    case 'measure':
      return `qc.measure(${instr.qubit}, ${instr.bit})`;
    case 'reset':
      return `qc.reset(${instr.qubit})`;
    case 'barrier':
      return instr.qubits ? `qc.barrier(${instr.qubits.join(', ')})` : `qc.barrier()`;
    case 'cond': {
      const inner = GATE_REGISTRY[instr.inner.gate].qiskit(instr.inner.qubits, instr.inner.params);
      return `with qc.if_test((qc.cregs[0][${instr.bit}], ${instr.value})):\n    ${inner}`;
    }
    default:
      return null;
  }
}

export function programToQiskit(program: Instruction[], numQubits: number, numBits: number): string {
  const lines: string[] = [
    'from qiskit import QuantumCircuit',
    '',
    `qc = QuantumCircuit(${numQubits}, ${numBits})`,
    '',
  ];
  for (const instr of program) {
    const line = instructionToQiskit(instr);
    if (line) lines.push(line);
  }
  return lines.join('\n');
}
