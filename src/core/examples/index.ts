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
    name: 'Estado de Bell',
    qubits: 2,
    description: 'Vetores encolhendo ao centro no CX; aresta C=1.0 no grafo de emaranhamento.',
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
    name: 'Teleporte quântico',
    qubits: 3,
    description: 'Modo ASK nos 4 ramos; q2 idêntico ao psi original em todos.',
    breakpoints: [10, 11],
    measurementMode: 'ASK',
    source: `qubits 3
bits 2

# preparar |psi> em q0
RY(q0, 0.9)
RZ(q0, 0.4)

# par de Bell entre q1 (Alice) e q2 (Bob)
bell: H(q1)
CX(q1, q2)
BARRIER

# Alice emaranha |psi> com sua metade
CX(q0, q1)
H(q0)
BARRIER

MEASURE(q0 -> c0)
MEASURE(q1 -> c1)

# correcoes de Bob
IF (c1 == 1) X(q2)
IF (c0 == 1) Z(q2)
`,
  },
  {
    id: 'deutsch-jozsa',
    name: 'Deutsch–Jozsa (n=2+1)',
    qubits: 3,
    description: 'Oráculo constante vs. balanceado trocável por comentário; interferência visível no H final.',
    breakpoints: [12],
    source: `qubits 3
bits 2

X(q2)
H(q0)
H(q1)
H(q2)

# oraculo BALANCEADO (comente as 2 linhas abaixo e descomente a identidade para oraculo CONSTANTE)
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
    name: 'Grover (n=2, 1 iteração)',
    qubits: 2,
    description: 'Amplitude do alvo crescendo no painel STATEVECTOR passo a passo.',
    breakpoints: [6, 15],
    source: `qubits 2
bits 2

H(q0)
H(q1)
BARRIER

# oraculo: marca |11>
CZ(q0, q1)
BARRIER

# difusor
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
    description: 'Anéis de entropia cheios com grafo par-a-par vazio (emaranhamento genuinamente tripartite).',
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
    description: 'Fase "voltando" para o controle — visível na equação polar de q0.',
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
