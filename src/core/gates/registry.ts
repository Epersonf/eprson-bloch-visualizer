import {
  H_MAT, X_MAT, Y_MAT, Z_MAT, S_MAT, SDG_MAT, T_MAT, TDG_MAT,
  RX_MAT, RY_MAT, RZ_MAT, P_MAT, U_MAT, type Mat2,
} from './matrices';

export type GateName =
  | 'H' | 'X' | 'Y' | 'Z' | 'S' | 'SDG' | 'T' | 'TDG'
  | 'RX' | 'RY' | 'RZ' | 'P' | 'U'
  | 'CX' | 'CY' | 'CZ' | 'CH' | 'SWAP' | 'CP' | 'CRX' | 'CRY' | 'CRZ'
  | 'CCX' | 'CSWAP';

export type GateKind = 'single' | 'controlled' | 'swap' | 'cswap';

export type GateGroup = '1-QUBIT' | 'ROTATIONS' | '2-QUBIT' | '3-QUBIT';

export interface GateDef {
  name: GateName;
  kind: GateKind;
  /** total qubit-refs expected (controls + targets, excludes SWAP's implicit pairing) */
  numQubits: number;
  numControls: number;
  numParams: number;
  group: GateGroup;
  /** the base 1-qubit unitary this gate applies (irrelevant for 'swap') */
  matrix(params: number[]): Mat2;
  matrixLabel: string;
  qiskit(qubits: number[], params: number[]): string;
  cirq(qubits: number[], params: number[]): string;
}

function fmtNum(x: number): string {
  // try to express as a multiple of pi for readability in generated snippets
  const overPi = x / Math.PI;
  const asFraction = (n: number, maxDen = 16): string | null => {
    for (let den = 1; den <= maxDen; den++) {
      const num = n * den;
      if (Math.abs(num - Math.round(num)) < 1e-9) {
        const r = Math.round(num);
        if (r === 0) return '0';
        if (den === 1) return `${r}*pi` === '1*pi' ? 'pi' : `${r}*pi`;
        if (r === 1) return `pi/${den}`;
        if (r === -1) return `-pi/${den}`;
        return `${r}*pi/${den}`;
      }
    }
    return null;
  };
  const frac = asFraction(overPi);
  if (frac) return `${frac.replace('*pi', ' * Math.PI').replace('pi', 'Math.PI')}`.trim();
  return x.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

const q = (i: number) => `q[${i}]`;

export const GATE_REGISTRY: Record<GateName, GateDef> = {
  H: {
    name: 'H', kind: 'single', numQubits: 1, numControls: 0, numParams: 0, group: '1-QUBIT',
    matrix: () => H_MAT, matrixLabel: '(1/sqrt2)[[1,1],[1,-1]]',
    qiskit: (qb) => `qc.h(${qb[0]})`,
    cirq: (qb) => `cirq.H(${q(qb[0])})`,
  },
  X: {
    name: 'X', kind: 'single', numQubits: 1, numControls: 0, numParams: 0, group: '1-QUBIT',
    matrix: () => X_MAT, matrixLabel: '[[0,1],[1,0]]',
    qiskit: (qb) => `qc.x(${qb[0]})`,
    cirq: (qb) => `cirq.X(${q(qb[0])})`,
  },
  Y: {
    name: 'Y', kind: 'single', numQubits: 1, numControls: 0, numParams: 0, group: '1-QUBIT',
    matrix: () => Y_MAT, matrixLabel: '[[0,-i],[i,0]]',
    qiskit: (qb) => `qc.y(${qb[0]})`,
    cirq: (qb) => `cirq.Y(${q(qb[0])})`,
  },
  Z: {
    name: 'Z', kind: 'single', numQubits: 1, numControls: 0, numParams: 0, group: '1-QUBIT',
    matrix: () => Z_MAT, matrixLabel: '[[1,0],[0,-1]]',
    qiskit: (qb) => `qc.z(${qb[0]})`,
    cirq: (qb) => `cirq.Z(${q(qb[0])})`,
  },
  S: {
    name: 'S', kind: 'single', numQubits: 1, numControls: 0, numParams: 0, group: '1-QUBIT',
    matrix: () => S_MAT, matrixLabel: 'diag(1, i)',
    qiskit: (qb) => `qc.s(${qb[0]})`,
    cirq: (qb) => `cirq.S(${q(qb[0])})`,
  },
  SDG: {
    name: 'SDG', kind: 'single', numQubits: 1, numControls: 0, numParams: 0, group: '1-QUBIT',
    matrix: () => SDG_MAT, matrixLabel: 'diag(1, -i)',
    qiskit: (qb) => `qc.sdg(${qb[0]})`,
    cirq: (qb) => `cirq.S(${q(qb[0])})**-1`,
  },
  T: {
    name: 'T', kind: 'single', numQubits: 1, numControls: 0, numParams: 0, group: '1-QUBIT',
    matrix: () => T_MAT, matrixLabel: 'diag(1, e^{i*pi/4})',
    qiskit: (qb) => `qc.t(${qb[0]})`,
    cirq: (qb) => `cirq.T(${q(qb[0])})`,
  },
  TDG: {
    name: 'TDG', kind: 'single', numQubits: 1, numControls: 0, numParams: 0, group: '1-QUBIT',
    matrix: () => TDG_MAT, matrixLabel: 'diag(1, e^{-i*pi/4})',
    qiskit: (qb) => `qc.tdg(${qb[0]})`,
    cirq: (qb) => `cirq.T(${q(qb[0])})**-1`,
  },
  RX: {
    name: 'RX', kind: 'single', numQubits: 1, numControls: 0, numParams: 1, group: 'ROTATIONS',
    matrix: (p) => RX_MAT(p[0]), matrixLabel: 'e^{-i*theta*X/2}',
    qiskit: (qb, p) => `qc.rx(${fmtNum(p[0])}, ${qb[0]})`,
    cirq: (qb, p) => `cirq.rx(${fmtNum(p[0])})(${q(qb[0])})`,
  },
  RY: {
    name: 'RY', kind: 'single', numQubits: 1, numControls: 0, numParams: 1, group: 'ROTATIONS',
    matrix: (p) => RY_MAT(p[0]), matrixLabel: 'e^{-i*theta*Y/2}',
    qiskit: (qb, p) => `qc.ry(${fmtNum(p[0])}, ${qb[0]})`,
    cirq: (qb, p) => `cirq.ry(${fmtNum(p[0])})(${q(qb[0])})`,
  },
  RZ: {
    name: 'RZ', kind: 'single', numQubits: 1, numControls: 0, numParams: 1, group: 'ROTATIONS',
    matrix: (p) => RZ_MAT(p[0]), matrixLabel: 'e^{-i*theta*Z/2}',
    qiskit: (qb, p) => `qc.rz(${fmtNum(p[0])}, ${qb[0]})`,
    cirq: (qb, p) => `cirq.rz(${fmtNum(p[0])})(${q(qb[0])})`,
  },
  P: {
    name: 'P', kind: 'single', numQubits: 1, numControls: 0, numParams: 1, group: 'ROTATIONS',
    matrix: (p) => P_MAT(p[0]), matrixLabel: 'diag(1, e^{i*lambda})',
    qiskit: (qb, p) => `qc.p(${fmtNum(p[0])}, ${qb[0]})`,
    cirq: (qb, p) => `cirq.ZPowGate(exponent=(${fmtNum(p[0])})/Math.PI)(${q(qb[0])})`,
  },
  U: {
    name: 'U', kind: 'single', numQubits: 1, numControls: 0, numParams: 3, group: 'ROTATIONS',
    matrix: (p) => U_MAT(p[0], p[1], p[2]), matrixLabel: 'U(theta,phi,lambda)',
    qiskit: (qb, p) => `qc.u(${fmtNum(p[0])}, ${fmtNum(p[1])}, ${fmtNum(p[2])}, ${qb[0]})`,
    cirq: (qb, p) => `# decompose: rz(${fmtNum(p[1])}) . ry(${fmtNum(p[0])}) . rz(${fmtNum(p[2])}) + global phase`,
  },
  CX: {
    name: 'CX', kind: 'controlled', numQubits: 2, numControls: 1, numParams: 0, group: '2-QUBIT',
    matrix: () => X_MAT, matrixLabel: 'CNOT, control q0',
    qiskit: (qb) => `qc.cx(${qb[0]}, ${qb[1]})`,
    cirq: (qb) => `cirq.CNOT(${q(qb[0])}, ${q(qb[1])})`,
  },
  CY: {
    name: 'CY', kind: 'controlled', numQubits: 2, numControls: 1, numParams: 0, group: '2-QUBIT',
    matrix: () => Y_MAT, matrixLabel: 'controlled-Y',
    qiskit: (qb) => `qc.cy(${qb[0]}, ${qb[1]})`,
    cirq: (qb) => `cirq.Y(${q(qb[1])}).controlled_by(${q(qb[0])})`,
  },
  CZ: {
    name: 'CZ', kind: 'controlled', numQubits: 2, numControls: 1, numParams: 0, group: '2-QUBIT',
    matrix: () => Z_MAT, matrixLabel: 'controlled-Z',
    qiskit: (qb) => `qc.cz(${qb[0]}, ${qb[1]})`,
    cirq: (qb) => `cirq.CZ(${q(qb[0])}, ${q(qb[1])})`,
  },
  CH: {
    name: 'CH', kind: 'controlled', numQubits: 2, numControls: 1, numParams: 0, group: '2-QUBIT',
    matrix: () => H_MAT, matrixLabel: 'controlled-H',
    qiskit: (qb) => `qc.ch(${qb[0]}, ${qb[1]})`,
    cirq: (qb) => `cirq.H(${q(qb[1])}).controlled_by(${q(qb[0])})`,
  },
  SWAP: {
    name: 'SWAP', kind: 'swap', numQubits: 2, numControls: 0, numParams: 0, group: '2-QUBIT',
    matrix: () => X_MAT, matrixLabel: 'swap',
    qiskit: (qb) => `qc.swap(${qb[0]}, ${qb[1]})`,
    cirq: (qb) => `cirq.SWAP(${q(qb[0])}, ${q(qb[1])})`,
  },
  CP: {
    name: 'CP', kind: 'controlled', numQubits: 2, numControls: 1, numParams: 1, group: '2-QUBIT',
    matrix: (p) => P_MAT(p[0]), matrixLabel: 'controlled phase',
    qiskit: (qb, p) => `qc.cp(${fmtNum(p[0])}, ${qb[0]}, ${qb[1]})`,
    cirq: (qb, p) => `cirq.CZPowGate(exponent=(${fmtNum(p[0])})/Math.PI)(${q(qb[0])}, ${q(qb[1])})`,
  },
  CRX: {
    name: 'CRX', kind: 'controlled', numQubits: 2, numControls: 1, numParams: 1, group: '2-QUBIT',
    matrix: (p) => RX_MAT(p[0]), matrixLabel: 'controlled-RX',
    qiskit: (qb, p) => `qc.crx(${fmtNum(p[0])}, ${qb[0]}, ${qb[1]})`,
    cirq: (qb, p) => `cirq.rx(${fmtNum(p[0])}).controlled()(${q(qb[0])}, ${q(qb[1])})`,
  },
  CRY: {
    name: 'CRY', kind: 'controlled', numQubits: 2, numControls: 1, numParams: 1, group: '2-QUBIT',
    matrix: (p) => RY_MAT(p[0]), matrixLabel: 'controlled-RY',
    qiskit: (qb, p) => `qc.cry(${fmtNum(p[0])}, ${qb[0]}, ${qb[1]})`,
    cirq: (qb, p) => `cirq.ry(${fmtNum(p[0])}).controlled()(${q(qb[0])}, ${q(qb[1])})`,
  },
  CRZ: {
    name: 'CRZ', kind: 'controlled', numQubits: 2, numControls: 1, numParams: 1, group: '2-QUBIT',
    matrix: (p) => RZ_MAT(p[0]), matrixLabel: 'controlled-RZ',
    qiskit: (qb, p) => `qc.crz(${fmtNum(p[0])}, ${qb[0]}, ${qb[1]})`,
    cirq: (qb, p) => `cirq.rz(${fmtNum(p[0])}).controlled()(${q(qb[0])}, ${q(qb[1])})`,
  },
  CCX: {
    name: 'CCX', kind: 'controlled', numQubits: 3, numControls: 2, numParams: 0, group: '3-QUBIT',
    matrix: () => X_MAT, matrixLabel: 'Toffoli',
    qiskit: (qb) => `qc.ccx(${qb[0]}, ${qb[1]}, ${qb[2]})`,
    cirq: (qb) => `cirq.CCX(${q(qb[0])}, ${q(qb[1])}, ${q(qb[2])})`,
  },
  CSWAP: {
    name: 'CSWAP', kind: 'cswap', numQubits: 3, numControls: 1, numParams: 0, group: '3-QUBIT',
    matrix: () => X_MAT, matrixLabel: 'Fredkin',
    qiskit: (qb) => `qc.cswap(${qb[0]}, ${qb[1]}, ${qb[2]})`,
    cirq: (qb) => `cirq.CSWAP(${q(qb[0])}, ${q(qb[1])}, ${q(qb[2])})`,
  },
};

export const GATE_NAMES = Object.keys(GATE_REGISTRY) as GateName[];

export function isGateName(s: string): s is GateName {
  return Object.prototype.hasOwnProperty.call(GATE_REGISTRY, s.toUpperCase());
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function suggestGateName(input: string): GateName | null {
  const upper = input.toUpperCase();
  let best: GateName | null = null;
  let bestDist = 3;
  for (const name of GATE_NAMES) {
    const d = levenshtein(upper, name);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return bestDist <= 2 ? best : null;
}
