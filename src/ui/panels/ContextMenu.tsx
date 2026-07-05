import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useDebuggerStore } from '../../store/StoreContext';
import { instructionToQiskit } from '../../core/export/toQiskit';
import { instructionToCirq } from '../../core/export/toCirq';
import { GATE_REGISTRY } from '../../core/gates/registry';
import { formatComplex } from '../../core/analysis/formats';
import type { Complex } from '../../core/gates/matrices';

function matrixText(gate: string, params: number[]): string {
  const def = GATE_REGISTRY[gate as keyof typeof GATE_REGISTRY];
  const m = def.matrix(params);
  const cell = (c: Complex) => formatComplex(c.re, c.im, 3);
  return `[[${cell(m.a)}, ${cell(m.b)}],\n [${cell(m.c)}, ${cell(m.d)}]]\n(${def.matrixLabel})`;
}

type Panel = 'qiskit' | 'cirq' | 'matrix' | null;

export const ContextMenu = observer(function ContextMenu() {
  const store = useDebuggerStore();
  const menu = store.contextMenu;
  const [panel, setPanel] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) { setPanel(null); return; }
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { store.closeContextMenu(); }
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') store.closeContextMenu(); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menu, store]);

  if (!menu) return null;
  const { x, y, instr } = menu;

  const qiskitSnippet = instructionToQiskit(instr);
  const cirqSnippet = instructionToCirq(instr);
  const gateForMatrix = instr.kind === 'gate' ? instr : instr.kind === 'cond' ? instr.inner : null;
  const hasBreakpoint = store.breakpoints.has(instr.line);

  function copy(text: string | null) {
    if (text) navigator.clipboard?.writeText(text).catch(() => {});
  }

  function deleteInstruction() {
    const lines = store.source.split(/\r\n|\n/);
    lines.splice(instr.line - 1, 1);
    store.setSource(lines.join('\n'));
    store.closeContextMenu();
  }

  return (
    <div className="context-menu" style={{ left: x, top: y }} ref={ref}>
      <button onClick={() => setPanel(panel === 'qiskit' ? null : 'qiskit')}>Equivalent in IBM Qiskit</button>
      {panel === 'qiskit' && (
        <div className="context-menu-snippet">
          {qiskitSnippet ?? '(no equivalent)'}
          <div><button onClick={() => copy(qiskitSnippet)}>copy</button></div>
        </div>
      )}
      <button onClick={() => setPanel(panel === 'cirq' ? null : 'cirq')}>Equivalent in Google Cirq</button>
      {panel === 'cirq' && (
        <div className="context-menu-snippet">
          {cirqSnippet ?? '(no equivalent)'}
          <div><button onClick={() => copy(cirqSnippet)}>copy</button></div>
        </div>
      )}
      {gateForMatrix && (
        <>
          <button onClick={() => setPanel(panel === 'matrix' ? null : 'matrix')}>Show matrix</button>
          {panel === 'matrix' && <div className="context-menu-snippet">{matrixText(gateForMatrix.gate, gateForMatrix.params)}</div>}
        </>
      )}
      <button onClick={() => { store.toggleBreakpoint(instr.line); store.closeContextMenu(); }}>
        {hasBreakpoint ? 'Remove breakpoint' : 'Add breakpoint here'}
      </button>
      <button onClick={() => { store.runToLine(instr.line); store.closeContextMenu(); }}>Run to here</button>
      <button onClick={deleteInstruction}>Delete instruction</button>
    </div>
  );
});
