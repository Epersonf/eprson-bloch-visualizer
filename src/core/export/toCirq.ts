import type { Instruction } from '../parser/ast';
import { GATE_REGISTRY } from '../gates/registry';

export function instructionToCirq(instr: Instruction): string | null {
  switch (instr.kind) {
    case 'decl-qubits':
    case 'decl-bits':
      return null;
    case 'gate':
      return `circuit.append(${GATE_REGISTRY[instr.gate].cirq(instr.qubits, instr.params)})`;
    case 'measure':
      return `circuit.append(cirq.measure(q[${instr.qubit}], key='c${instr.bit}'))`;
    case 'reset':
      return `circuit.append(cirq.reset(q[${instr.qubit}]))`;
    case 'barrier':
      return null; // no equivalent; omitted from the export
    case 'cond': {
      const inner = GATE_REGISTRY[instr.inner.gate].cirq(instr.inner.qubits, instr.inner.params);
      return `circuit.append(${inner}.with_classical_controls('c${instr.bit}'))`;
    }
    default:
      return null;
  }
}

export function programToCirq(program: Instruction[], numQubits: number): string {
  const lines: string[] = [
    'import cirq',
    '',
    `q = cirq.LineQubit.range(${numQubits})`,
    'circuit = cirq.Circuit()',
    '',
  ];
  for (const instr of program) {
    const line = instructionToCirq(instr);
    if (line) lines.push(line);
  }
  return lines.join('\n');
}
