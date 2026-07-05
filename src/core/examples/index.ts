export interface ExampleAlgorithm {
  id: string;
  name: string;
  qubits: number;
  description: string;
  source: string;
  /** line numbers to pre-position breakpoints at pedagogical "aha" moments */
  breakpoints: number[];
  measurementMode?: 'SAMPLE' | 'ASK';
}

export const EXAMPLES: ExampleAlgorithm[] = [
  {
    id: 'bell',
    name: 'Bell state',
    qubits: 2,
    description: 'Vectors shrinking to the center on CX; C=1.0 edge in the entanglement graph.',
    breakpoints: [4],
    source: `qubits 2
bits 2

H(q0)
CX(q0, q1)

MEASURE(q0 -> c0)
MEASURE(q1 -> c1)
`,
  },
  {
    id: 'teleport',
    name: 'Quantum teleportation',
    qubits: 3,
    description: 'ASK mode across all 4 branches; q2 matches the original psi in every one.',
    breakpoints: [10, 11],
    measurementMode: 'ASK',
    source: `qubits 3
bits 2

# prepare |psi> on q0
RY(q0, 0.9)
RZ(q0, 0.4)

# Bell pair between q1 (Alice) and q2 (Bob)
bell: H(q1)
CX(q1, q2)
BARRIER

# Alice entangles |psi> with her half
CX(q0, q1)
H(q0)
BARRIER

MEASURE(q0 -> c0)
MEASURE(q1 -> c1)

# Bob's corrections
IF (c1 == 1) X(q2)
IF (c0 == 1) Z(q2)
`,
  },
  {
    id: 'deutsch-jozsa',
    name: 'Deutsch–Jozsa (n=2+1)',
    qubits: 3,
    description: 'Constant vs. balanced oracle swappable via comment; interference visible on the final H.',
    breakpoints: [12],
    source: `qubits 3
bits 2

X(q2)
H(q0)
H(q1)
H(q2)

# BALANCED oracle (comment the 2 lines below and uncomment the identity for a CONSTANT oracle)
CX(q0, q2)
CX(q1, q2)

H(q0)
H(q1)

MEASURE(q0 -> c0)
MEASURE(q1 -> c1)
`,
  },
  {
    id: 'grover',
    name: 'Grover (n=2, 1 iteration)',
    qubits: 2,
    description: 'Target amplitude growing step by step in the STATEVECTOR panel.',
    breakpoints: [6, 15],
    source: `qubits 2
bits 2

H(q0)
H(q1)
BARRIER

# oracle: marks |11>
CZ(q0, q1)
BARRIER

# diffuser
H(q0)
H(q1)
X(q0)
X(q1)
CZ(q0, q1)
X(q0)
X(q1)
H(q0)
H(q1)

MEASURE(q0 -> c0)
MEASURE(q1 -> c1)
`,
  },
  {
    id: 'ghz',
    name: 'GHZ',
    qubits: 3,
    description: 'Full entropy rings with an empty pairwise graph (genuinely tripartite entanglement).',
    breakpoints: [6],
    source: `qubits 3
bits 3

H(q0)
CX(q0, q1)
CX(q1, q2)

MEASURE(q0 -> c0)
MEASURE(q1 -> c1)
MEASURE(q2 -> c2)
`,
  },
  {
    id: 'phase-kickback',
    name: 'Phase kickback',
    qubits: 2,
    description: 'Phase "kicking back" onto the control — visible in q0\'s polar equation.',
    breakpoints: [7],
    source: `qubits 2
bits 1

X(q1)
H(q0)
H(q1)

CX(q0, q1)
H(q0)

MEASURE(q0 -> c0)
`,
  },
];

export function getExample(id: string): ExampleAlgorithm | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
