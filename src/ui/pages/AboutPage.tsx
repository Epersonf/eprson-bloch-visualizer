export function AboutPage() {
  return (
    <div style={{ padding: 20, maxWidth: 720, lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 16 }}>EPRson Bloch Visualizer</h1>
      <p>
        A visual quantum circuit debugger that runs 100% in the browser. Write a circuit in QIR
        (Quantum Instruction Representation) and step through it like a classic code debugger:
        each instruction is a line, each step updates the global state, and per-qubit panels show
        the Bloch sphere, the state equation, the P(0)/P(1) probabilities, the relative phase, and
        entanglement indicators.
      </p>
      <p>
        Zero backend: the simulation core (statevector engine) is pure TypeScript. Fidelity with
        Qiskit is guaranteed by the little-endian index convention and the QIR ↔ Qiskit ↔ Cirq
        equivalence table used by both the parser and the "equivalent in..." context menu.
      </p>
      <p>
        Use the <strong>LOAD</strong> menu in the header to load ready-made examples (Bell, Teleportation,
        Deutsch–Jozsa, Grover, GHZ, Phase kickback), each with breakpoints already positioned at the
        most interesting teaching moments.
      </p>
    </div>
  );
}
