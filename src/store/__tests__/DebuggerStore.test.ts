import { describe, it, expect } from 'vitest';
import { DebuggerStore } from '../DebuggerStore';

function freshStore(source: string, measurementMode: 'SAMPLE' | 'ASK' = 'ASK'): DebuggerStore {
  const store = new DebuggerStore();
  store.setMeasurementMode(measurementMode);
  store.setSource(source);
  return store;
}

describe('DebuggerStore — impossible measurement outcomes', () => {
  const DETERMINISTIC_ZERO = 'qubits 1\nbits 1\nMEASURE(q0 -> c0)\n'; // q0 stays |0>, so c0 can only ever be 0

  it('refuses to force an outcome with ~0 probability (ASK mode) and leaves the state untouched', () => {
    const store = freshStore(DETERMINISTIC_ZERO);
    store.step(); // pauses at AWAITING_MEASUREMENT
    expect(store.status).toBe('AWAITING_MEASUREMENT');
    expect(store.pending?.p1).toBeCloseTo(0, 9);

    store.chooseOutcome(1); // impossible: p(1) ~ 0
    expect(store.status).toBe('AWAITING_MEASUREMENT'); // still waiting, nothing corrupted
    expect(store.pending).not.toBeNull();

    // the state must still be well-formed (unit norm), not corrupted by a bad forced collapse
    const snap = store.current!;
    let norm2 = 0;
    for (let i = 0; i < snap.state.re.length; i++) norm2 += snap.state.re[i] ** 2 + snap.state.im[i] ** 2;
    expect(norm2).toBeCloseTo(1, 9);
  });

  it('accepts the physically possible outcome normally', () => {
    const store = freshStore(DETERMINISTIC_ZERO);
    store.step();
    store.chooseOutcome(0); // possible: p(0) ~ 1
    expect(store.status).toBe('DONE');
    expect(store.current?.bits[0]).toBe(0);
    let norm2 = 0;
    const snap = store.current!;
    for (let i = 0; i < snap.state.re.length; i++) norm2 += snap.state.re[i] ** 2 + snap.state.im[i] ** 2;
    expect(norm2).toBeCloseTo(1, 9);
  });

  it('a FIXED script requesting an impossible branch is corrected instead of corrupting the state', () => {
    const store = freshStore(DETERMINISTIC_ZERO, 'SAMPLE');
    store.setMeasurementMode({ fixed: [1] }); // asks for the impossible branch on the only measurement
    store.step();
    expect(store.status).toBe('DONE');
    expect(store.current?.bits[0]).toBe(0); // corrected to the only possible outcome
    let norm2 = 0;
    const snap = store.current!;
    for (let i = 0; i < snap.state.re.length; i++) norm2 += snap.state.re[i] ** 2 + snap.state.im[i] ** 2;
    expect(norm2).toBeCloseTo(1, 9);
  });
});
