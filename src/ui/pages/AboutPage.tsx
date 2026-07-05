export function AboutPage() {
  return (
    <div style={{ padding: 20, maxWidth: 720, lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 16 }}>EPRson Bloch Visualizer</h1>
      <p>
        Depurador visual de circuitos quânticos que roda 100% no browser. Escreva um circuito em QIR
        (Quantum Instruction Representation) e execute passo a passo como num debugger de código clássico:
        cada instrução é uma linha, cada passo atualiza o estado global, e painéis mostram — por qubit —
        a esfera de Bloch, a equação de estado, as probabilidades P(0)/P(1), a fase relativa e indicadores
        de emaranhamento.
      </p>
      <p>
        Zero backend: o núcleo de simulação (statevector engine) é TypeScript puro. A fidelidade com o
        Qiskit é garantida por convenção de índices little-endian e pela tabela de equivalência QIR ↔
        Qiskit ↔ Cirq usada tanto pelo parser quanto pelo menu de contexto "equivalente em...".
      </p>
      <p>
        Use o menu <strong>LOAD</strong> no cabeçalho para carregar exemplos pré-prontos (Bell, Teleporte,
        Deutsch–Jozsa, Grover, GHZ, Phase kickback), cada um com breakpoints já posicionados nos momentos
        pedagógicos mais interessantes.
      </p>
    </div>
  );
}
