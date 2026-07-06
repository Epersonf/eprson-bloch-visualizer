import { describe, it, expect } from 'vitest';
import { DebuggerStore } from '../DebuggerStore';

function freshStore(source: string, measurementMode: 'SAMPLE' | 'ASK' = 'ASK'): DebuggerStore {
  const store = new DebuggerStore();
  store.setMeasurementMode(measurementMode);
  store.setSource(source);
  return store;
}

function stateNorm2(store: DebuggerStore): number {
  const snap = store.current!;
  let norm2 = 0;
  for (let i = 0; i < snap.state.re.length; i++) norm2 += snap.state.re[i] ** 2 + snap.state.im[i] ** 2;
  return norm2;
}

describe('DebuggerStore — deterministic ASK measurements auto-resolve without pausing', () => {
  const DETERMINISTIC_ZERO = 'qubits 1\nbits 1\nMEASURE(q0 -> c0)\n'; // q0 stays |0>, so c0 can only ever be 0

  it('never pauses for a measurement with only one possible outcome', () => {
    const store = freshStore(DETERMINISTIC_ZERO);
    store.step();
    expect(store.status).toBe('DONE'); // resolved straight through, no AWAITING_MEASUREMENT at all
    expect(store.pending).toBeNull();
    expect(store.current?.bits[0]).toBe(0);
    expect(stateNorm2(store)).toBeCloseTo(1, 9);
  });

  it('continueRun also sails through deterministic measurements without stopping', () => {
    const store = freshStore(DETERMINISTIC_ZERO);
    store.continueRun();
    expect(store.status).toBe('DONE');
    expect(store.current?.bits[0]).toBe(0);
  });
});

describe('DebuggerStore — non-deterministic ASK measurements still pause and offer real choices', () => {
  // H(q0) then measure: genuinely 50/50, so this must still prompt
  const COIN_FLIP = 'qubits 1\nbits 1\nH(q0)\nMEASURE(q0 -> c0)\nX(q0)\n';

  it('pauses with both outcomes available', () => {
    const store = freshStore(COIN_FLIP);
    store.step(); // H
    store.step(); // MEASURE -> pauses
    expect(store.status).toBe('AWAITING_MEASUREMENT');
    expect(store.pending?.p1).toBeCloseTo(0.5, 6);
    expect(store.pending?.resumeMode).toBe('step');
  });

  it('a Step-triggered pause stops right after resolving (does not auto-continue to the next instruction)', () => {
    const store = freshStore(COIN_FLIP);
    store.step(); // H
    store.step(); // MEASURE -> pauses (via step)
    store.chooseOutcome(0);
    expect(store.status).toBe('PAUSED'); // stopped here, X(q0) not yet executed
    expect(store.current?.bits[0]).toBe(0);
    expect(stateNorm2(store)).toBeCloseTo(1, 9);
  });

  it('a Run-triggered pause resumes running automatically after the choice is made', () => {
    const store = freshStore(COIN_FLIP);
    store.continueRun(); // runs H, then pauses at MEASURE (via run)
    expect(store.status).toBe('AWAITING_MEASUREMENT');
    expect(store.pending?.resumeMode).toBe('run');
    store.chooseOutcome(1);
    expect(store.status).toBe('DONE'); // resumed and ran X(q0) through to the end
    expect(store.current?.bits[0]).toBe(1);
    expect(stateNorm2(store)).toBeCloseTo(1, 9);
  });

  it('refuses to force the impossible branch of a genuine (non-deterministic) choice gone wrong', () => {
    // sanity check the defense-in-depth guard still holds even though the UI never offers this
    const store = freshStore(COIN_FLIP);
    store.step();
    store.step();
    expect(store.status).toBe('AWAITING_MEASUREMENT');
    // both are ~0.5 here, so manufacture an artificial near-zero probability to exercise the guard
    store.pending!.p1 = 1e-12;
    store.chooseOutcome(1);
    expect(store.status).toBe('AWAITING_MEASUREMENT'); // rejected, still waiting
  });

  it('"Random" samples an outcome weighted by the true probabilities and resumes like a normal choice', () => {
    const store = freshStore(COIN_FLIP);
    store.step();
    store.step();
    store.chooseRandomOutcome();
    expect(store.status).toBe('PAUSED');
    expect([0, 1]).toContain(store.current?.bits[0]);
    expect(stateNorm2(store)).toBeCloseTo(1, 9);
  });
});

describe('DebuggerStore — FIXED mode script correction', () => {
  const DETERMINISTIC_ZERO = 'qubits 1\nbits 1\nMEASURE(q0 -> c0)\n';

  it('a FIXED script requesting an impossible branch is corrected instead of corrupting the state', () => {
    const store = freshStore(DETERMINISTIC_ZERO, 'SAMPLE');
    store.setMeasurementMode({ fixed: [1] }); // asks for the impossible branch on the only measurement
    store.step();
    expect(store.status).toBe('DONE');
    expect(store.current?.bits[0]).toBe(0); // corrected to the only possible outcome
    expect(stateNorm2(store)).toBeCloseTo(1, 9);
  });
});
