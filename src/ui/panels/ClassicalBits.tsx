import { observer } from 'mobx-react-lite';
import { useDebuggerStore } from '../../store/StoreContext';

export const ClassicalBits = observer(function ClassicalBits() {
  const store = useDebuggerStore();
  const snap = store.current;
  if (!snap) return <div className="empty-state">no state</div>;

  return (
    <div className="classical-bits">
      {snap.bits.map((b, i) => (
        <div className="classical-bit" key={i}>
          <div>c{i}</div>
          <div className="val">{b === null ? '·' : b}</div>
        </div>
      ))}
      {snap.bits.length === 0 && <div className="empty-state">no classical bits declared</div>}
    </div>
  );
});
