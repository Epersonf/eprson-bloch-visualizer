import { observer } from 'mobx-react-lite';
import { useDebuggerStore } from '../../store/StoreContext';

export const MeasurementPrompt = observer(function MeasurementPrompt() {
  const store = useDebuggerStore();
  if (store.status !== 'AWAITING_MEASUREMENT' || !store.pending) return null;
  const { qubit, bit, p1 } = store.pending;

  return (
    <div
      style={{
        position: 'fixed', left: '50%', top: 44, transform: 'translateX(-50%)',
        background: 'var(--bg-1)', border: '1px solid var(--acc-meas)', padding: 10, zIndex: 900,
        display: 'flex', gap: 10, alignItems: 'center',
      }}
    >
      <span>MEASURE q{qubit} → c{bit}:</span>
      <button onClick={() => store.chooseOutcome(0)}>[0] p={(1 - p1).toFixed(3)}</button>
      <button onClick={() => store.chooseOutcome(1)}>[1] p={p1.toFixed(3)}</button>
    </div>
  );
});
