import { describe, it, expect } from 'vitest';
import { parseProgram } from '../parser/parser';

describe('parser', () => {
  it('parses declarations, gates, measure, reset, barrier', () => {
    const src = `qubits 2\nbits 2\nH(q0)\nCX(q0, q1)\nBARRIER\nRESET(q0)\nMEASURE(q1 -> c1)\n`;
    const result = parseProgram(src);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.program.numQubits).toBe(2);
    expect(result.program.numBits).toBe(2);
    const kinds = result.program.instructions.map((i) => i.kind);
    expect(kinds).toEqual(['decl-qubits', 'decl-bits', 'gate', 'gate', 'barrier', 'reset', 'measure']);
  });

  it('parses conditional instructions', () => {
    const src = `qubits 1\nbits 1\nMEASURE(q0 -> c0)\nIF (c0 == 1) X(q0)\n`;
    const result = parseProgram(src);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cond = result.program.instructions.find((i) => i.kind === 'cond');
    expect(cond).toBeDefined();
    if (cond?.kind === 'cond') {
      expect(cond.bit).toBe(0);
      expect(cond.value).toBe(1);
      expect(cond.inner.gate).toBe('X');
    }
  });

  it.each([
    ['pi/2', Math.PI / 2],
    ['3*pi/4', (3 * Math.PI) / 4],
    ['-pi', -Math.PI],
    ['0.9', 0.9],
  ])('resolves angle %s to radians', (angleSrc, expected) => {
    const src = `qubits 1\nRY(q0, ${angleSrc})\n`;
    const result = parseProgram(src);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const gate = result.program.instructions.find((i) => i.kind === 'gate');
    expect(gate?.kind).toBe('gate');
    if (gate?.kind === 'gate') expect(gate.params[0]).toBeCloseTo(expected, 9);
  });

  it('reports qubit out of declared range', () => {
    const src = `qubits 1\nX(q3)\n`;
    const result = parseProgram(src);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].message).toMatch(/fora do range/);
  });

  it('suggests a gate name via Levenshtein distance', () => {
    const src = `qubits 3\nCCXX(q0, q1, q2)\n`;
    const result = parseProgram(src);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].hint).toMatch(/CCX\?/);
  });

  it('warns (not errors) when IF references a never-measured bit', () => {
    const src = `qubits 1\nbits 1\nIF (c0 == 1) X(q0)\n`;
    const result = parseProgram(src);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toMatch(/ainda não foi medido/);
  });
});
