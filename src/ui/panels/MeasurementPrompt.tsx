import { observer } from 'mobx-react-lite';
import { useDebuggerStore } from '../../store/StoreContext';
import { MEASUREMENT_EPS } from '../../core/sim/measure';

export const MeasurementPrompt = observer(function MeasurementPrompt() {
  const store = useDebuggerStore();
  if (store.status !== 'AWAITING_MEASUREMENT' || !store.pending) return null;
  const { qubit, bit, p1 } = store.pending;
  const p0 = 1 - p1;
  const zeroImpossible = p0 < MEASUREMENT_EPS;
  const oneImpossible = p1 < MEASUREMENT_EPS;

  return (
    <div
      style={{
        position: 'fixed', left: '50%', top: 44, transform: 'translateX(-50%)',
        background: 'var(--bg-1)', border: '1px solid var(--acc-meas)', padding: 10, zIndex: 900,
        display: 'flex', gap: 10, alignItems: 'center',
      }}
    >
      <span>MEASURE q{qubit} → c{bit}:</span>
      <button
        onClick={() => store.chooseOutcome(0)}
        disabled={zeroImpossible}
        title={zeroImpossible ? 'impossible outcome (p ≈ 0)' : undefined}
      >
        [0] p={p0.toFixed(3)}
      </button>
      <button
        onClick={() => store.chooseOutcome(1)}
        disabled={oneImpossible}
        title={oneImpossible ? 'impossible outcome (p ≈ 0)' : undefined}
      >
        [1] p={p1.toFixed(3)}
      </button>
      <button onClick={() => store.chooseRandomOutcome()} title="Sample this measurement randomly, weighted by its probabilities">
        🎲 Random
      </button>
    </div>
  );
});
