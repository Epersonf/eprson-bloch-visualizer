import { observer } from 'mobx-react-lite';
import { useDebuggerStore } from '../../store/StoreContext';
import type { BottomTab } from '../../store/DebuggerStore';
import { StatevectorPanel } from './StatevectorPanel';
import { EntGraph } from './EntGraph';
import { ClassicalBits } from './ClassicalBits';
import { LogPanel } from './LogPanel';

const TABS: { id: BottomTab; label: string }[] = [
  { id: 'STATEVECTOR', label: 'STATEVECTOR' },
  { id: 'ENT_GRAPH', label: 'ENT GRAPH' },
  { id: 'CLASSICAL', label: 'CLASSICAL' },
  { id: 'LOG', label: 'LOG' },
];

export const BottomPanel = observer(function BottomPanel() {
  const store = useDebuggerStore();
  return (
    <div className="pane">
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={store.bottomTab === t.id ? 'active' : ''} onClick={() => store.setBottomTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {store.bottomTab === 'STATEVECTOR' && <StatevectorPanel />}
      {store.bottomTab === 'ENT_GRAPH' && <EntGraph />}
      {store.bottomTab === 'CLASSICAL' && <ClassicalBits />}
      {store.bottomTab === 'LOG' && <LogPanel />}
    </div>
  );
});
