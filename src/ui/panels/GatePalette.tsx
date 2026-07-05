import { observer } from 'mobx-react-lite';
import { useState, useMemo } from 'react';
import { GATE_REGISTRY, GATE_NAMES, type GateGroup } from '../../core/gates/registry';
import { useDebuggerStore } from '../../store/StoreContext';

const GROUPS: GateGroup[] = ['1-QUBIT', 'ROTATIONS', '2-QUBIT', '3-QUBIT'];

function template(gateName: string): string {
  const def = GATE_REGISTRY[gateName as keyof typeof GATE_REGISTRY];
  const qubits = Array.from({ length: def.numQubits }, (_, i) => `q${i}`);
  const params = Array.from({ length: def.numParams }, () => '0');
  return `${gateName}(${[...qubits, ...params].join(', ')})`;
}

export const GatePalette = observer(function GatePalette() {
  const store = useDebuggerStore();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => GATE_NAMES.filter((n) => n.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  function insertGate(gateName: string) {
    const line = template(gateName);
    store.setSource(store.source.replace(/\s*$/, '') + `\n${line}\n`);
  }

  return (
    <aside className="sidebar">
      <input
        className="search"
        placeholder="/ buscar gate"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {GROUPS.map((group) => {
        const names = filtered.filter((n) => GATE_REGISTRY[n].group === group);
        if (names.length === 0) return null;
        return (
          <div key={group}>
            <div className="gate-group-title">{group}</div>
            {names.map((name) => {
              const def = GATE_REGISTRY[name];
              const arity = [
                def.numQubits ? `${def.numQubits}q` : '',
                def.numParams ? `${def.numParams}p` : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={name}
                  className="gate-item"
                  title={def.matrixLabel}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/eprson-gate', name)}
                  onClick={() => insertGate(name)}
                >
                  <span className="name">{name}</span>
                  <span className="arity">{arity}</span>
                </button>
              );
            })}
          </div>
        );
      })}
      <div>
        <div className="gate-group-title">CLASSICAL</div>
        <button className="gate-item" onClick={() => store.setSource(store.source.replace(/\s*$/, '') + `\nMEASURE(q0 -> c0)\n`)}>
          <span className="name">MEASURE</span>
        </button>
        <button className="gate-item" onClick={() => store.setSource(store.source.replace(/\s*$/, '') + `\nRESET(q0)\n`)}>
          <span className="name">RESET</span>
        </button>
        <button className="gate-item" onClick={() => store.setSource(store.source.replace(/\s*$/, '') + `\nIF (c0 == 1) X(q0)\n`)}>
          <span className="name">IF</span>
        </button>
        <button className="gate-item" onClick={() => store.setSource(store.source.replace(/\s*$/, '') + `\nBARRIER\n`)}>
          <span className="name">BARRIER</span>
        </button>
      </div>
    </aside>
  );
});
