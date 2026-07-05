import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { useDebuggerStore } from '../../store/StoreContext';
import { programToQiskit } from '../../core/export/toQiskit';
import { programToCirq } from '../../core/export/toCirq';

const STATUS_CLASS: Record<string, string> = {
  PAUSED: 'paused',
  RUNNING: 'running',
  DONE: 'done',
  AWAITING_MEASUREMENT: 'awaiting',
};

export const Header = observer(function Header() {
  const store = useDebuggerStore();

  return (
    <header className="header">
      <span className="brand">EPRson v1</span>
      <span className="sep">|</span>
      <div className="field">
        <label htmlFor="seed-input">seed:</label>
        <input
          id="seed-input"
          type="number"
          value={store.seed}
          onChange={(e) => store.setSeed(Number(e.target.value) || 0)}
        />
      </div>
      <div className="field">
        <label htmlFor="mode-select">mode:</label>
        <select
          id="mode-select"
          value={store.measurementMode === 'SAMPLE' || store.measurementMode === 'ASK' ? store.measurementMode : 'FIXED'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'SAMPLE' || v === 'ASK') store.setMeasurementMode(v);
          }}
        >
          <option value="SAMPLE">SAMPLE</option>
          <option value="ASK">ASK</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="load-select">LOAD:</label>
        <select
          id="load-select"
          value={store.selectedExampleId ?? ''}
          onChange={(e) => e.target.value && store.loadExample(e.target.value)}
        >
          <option value="" disabled>escolher exemplo...</option>
          {store.examples.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>
      <span className={`status-badge ${STATUS_CLASS[store.status] ?? ''}`}>{store.status}</span>

      <div className="controls">
        <button onClick={() => store.step()} disabled={!store.canStepForward} title="Step over (F10 / j)">STEP</button>
        <button onClick={() => store.stepBack()} disabled={!store.canStepBack} title="Step back (Shift+F10 / k)">BACK</button>
        <button onClick={() => store.continueRun()} disabled={store.status === 'DONE' || store.status === 'IDLE'} title="Continue (F5)">RUN</button>
        <button onClick={() => store.resetRun()} title="Reset (Ctrl+R)">RESET</button>
        {store.current?.lastOutcome && (
          <button onClick={() => store.rerollMeasurement()} title="Re-roll da última medição (r)">RE-ROLL</button>
        )}
        <button
          onClick={() => navigator.clipboard?.writeText(programToQiskit(store.program, store.numQubits, store.numBits)).catch(() => {})}
          title="Copiar programa Qiskit completo"
        >
          EXPORT QISKIT
        </button>
        <button
          onClick={() => navigator.clipboard?.writeText(programToCirq(store.program, store.numQubits)).catch(() => {})}
          title="Copiar programa Cirq completo"
        >
          EXPORT CIRQ
        </button>
      </div>

      <nav>
        <Link to="/">debugger</Link>
        <Link to="/about">sobre</Link>
      </nav>
    </header>
  );
});
