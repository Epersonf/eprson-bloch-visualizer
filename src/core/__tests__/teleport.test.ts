import { describe, it, expect } from 'vitest';
import { parseProgram } from '../parser/parser';
import { runtimeInstructions, createInitialSnapshot, stepNonMeasure, stepMeasure, type Snapshot } from '../debug/interpreter';
import { initState } from '../sim/state';
import { applyGate1 } from '../sim/apply';
import { RY_MAT, RZ_MAT } from '../gates/matrices';
import { reducedDensity } from '../analysis/density';
import { blochVector } from '../analysis/bloch';

const TELEPORT_SRC = `
qubits 3
bits 2

RY(q0, 0.9)
RZ(q0, 0.4)

H(q1)
CX(q1, q2)
BARRIER

CX(q0, q1)
H(q0)
BARRIER

MEASURE(q0 -> c0)
MEASURE(q1 -> c1)

IF (c1 == 1) X(q2)
IF (c0 == 1) Z(q2)
`;

function originalPsiBloch() {
  const s = initState(1);
  applyGate1(s, 0, RY_MAT(0.9));
  applyGate1(s, 0, RZ_MAT(0.4));
  return blochVector(reducedDensity(s, 0));
}

function runTeleport(outcome0: 0 | 1, outcome1: 0 | 1): Snapshot {
  const result = parseProgram(TELEPORT_SRC);
  if (!result.ok) throw new Error('parse failed');
  const rt = runtimeInstructions(result.program.instructions);
  let snap = createInitialSnapshot(result.program.numQubits, result.program.numBits, 1);

  for (const instr of rt) {
    if (instr.kind === 'measure') {
      const outcome = instr.bit === 0 ? outcome0 : outcome1;
      snap = stepMeasure(snap, instr, outcome);
    } else {
      snap = stepNonMeasure(snap, instr);
    }
  }
  return snap;
}

describe('quantum teleportation', () => {
  const expected = originalPsiBloch();

  it.each([
    [0, 0], [0, 1], [1, 0], [1, 1],
  ] as const)('reproduces the original state on q2 for branch c0=%d c1=%d', (c0, c1) => {
    const snap = runTeleport(c0, c1);
    const q2Bloch = blochVector(reducedDensity(snap.state, 2));
    expect(q2Bloch.x).toBeCloseTo(expected.x, 6);
    expect(q2Bloch.y).toBeCloseTo(expected.y, 6);
    expect(q2Bloch.z).toBeCloseTo(expected.z, 6);
  });
});
