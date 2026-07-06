import { describe, it, expect } from 'vitest';
import { serializeProjectFile, parseProjectFile } from '../export/projectFile';
import type { SerializedState } from '../serialize';

describe('proprietary .eprson project file format', () => {
  const state: SerializedState = {
    source: 'qubits 2\nbits 2\nH(q0)\nCX(q0, q1)\n',
    seed: 42,
    measurementMode: 'ASK',
    breakpoints: [3, 4],
    exampleId: 'bell',
  };

  it('round-trips through serialize/parse', () => {
    const text = serializeProjectFile(state);
    const parsed = parseProjectFile(text);
    expect(parsed).toEqual(state);
  });

  it('tags the file with a format/version marker', () => {
    const text = serializeProjectFile(state);
    const obj = JSON.parse(text);
    expect(obj.format).toBe('eprson-circuit');
    expect(obj.version).toBe(1);
  });

  it('rejects unrelated JSON', () => {
    expect(parseProjectFile(JSON.stringify({ hello: 'world' }))).toBeNull();
  });

  it('rejects malformed JSON', () => {
    expect(parseProjectFile('not json at all')).toBeNull();
  });

  it('defaults missing optional fields', () => {
    const minimal = JSON.stringify({ format: 'eprson-circuit', version: 1, source: 'qubits 1\n' });
    expect(parseProjectFile(minimal)).toEqual({
      source: 'qubits 1\n',
      seed: 1337,
      measurementMode: 'SAMPLE',
      breakpoints: [],
      exampleId: undefined,
    });
  });
});
