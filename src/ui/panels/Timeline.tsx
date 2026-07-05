import { observer } from 'mobx-react-lite';
import type { Instruction } from '../../core/parser/ast';
import { useDebuggerStore } from '../../store/StoreContext';

function qubitsInvolved(instr: Instruction): number[] {
  switch (instr.kind) {
    case 'gate': return instr.qubits;
    case 'measure': return [instr.qubit];
    case 'reset': return [instr.qubit];
    case 'cond': return instr.inner.qubits;
    case 'barrier': return instr.qubits ?? [];
    default: return [];
  }
}

function labelFor(instr: Instruction): string {
  switch (instr.kind) {
    case 'gate': return `[${instr.gate}]`;
    case 'measure': return `[M→c${instr.bit}]`;
    case 'reset': return '[RST]';
    case 'cond': return `[IF c${instr.bit}=${instr.value} ${instr.inner.gate}]`;
    case 'barrier': return '┊';
    default: return '';
  }
}

export const Timeline = observer(function Timeline() {
  const store = useDebuggerStore();
  const rt = store.runtimeProgram;
  const n = store.numQubits;

  if (n === 0) return <div className="empty-state">no circuit loaded</div>;

  return (
    <div className="timeline">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `32px repeat(${rt.length || 1}, minmax(46px, max-content))`,
          gridTemplateRows: `repeat(${n}, 26px)`,
          rowGap: 2,
          columnGap: 4,
          alignItems: 'center',
        }}
      >
        {Array.from({ length: n }, (_, q) => (
          <div key={`label-${q}`} className={`qlabel qubit-color-${q % 6}`} style={{ gridColumn: 1, gridRow: q + 1 }}>
            q{q}
          </div>
        ))}
        {rt.map((instr, colIdx) => {
          const involved = qubitsInvolved(instr);
          const isFuture = colIdx >= store.cursor;
          const isCurrentPc = colIdx === store.cursor;
          return involved.map((q) => (
            <div
              key={`${colIdx}-${q}`}
              className={`timeline-block ${isFuture ? 'future' : ''} ${isCurrentPc ? 'current-pc' : ''}`}
              style={{ gridColumn: colIdx + 2, gridRow: q + 1 }}
              onClick={() => store.runToLine(instr.line)}
              onContextMenu={(e) => { e.preventDefault(); store.openContextMenu(e.clientX, e.clientY, instr); }}
              title={`line ${instr.line}`}
            >
              {labelFor(instr)}
            </div>
          ));
        })}
      </div>
    </div>
  );
});
