import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { getStatevectorRows } from '../../core/analysis/selectors';
import { formatAngle } from '../../core/analysis/formats';
import { useDebuggerStore } from '../../store/StoreContext';

export const StatevectorPanel = observer(function StatevectorPanel() {
  const store = useDebuggerStore();
  const [minP, setMinP] = useState(0.001);
  const snap = store.current;
  if (!snap) return <div className="empty-state">sem estado</div>;

  const rows = getStatevectorRows(snap.state).filter((r) => r.probability >= minP);

  return (
    <div className="pane-body">
      <div style={{ padding: '4px 8px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <label htmlFor="minp">filtro p &gt;</label>
        <input id="minp" type="number" step="0.001" value={minP} onChange={(e) => setMinP(Number(e.target.value) || 0)} style={{ width: 70 }} />
      </div>
      <table className="sv-table">
        <thead>
          <tr><th>estado</th><th>prob</th><th>fase</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.index}>
              <td>{r.label}</td>
              <td>{r.probability.toFixed(4)}</td>
              <td>∠{formatAngle(r.phase)}</td>
              <td><span className="sv-bar" style={{ width: `${Math.round(r.probability * 100)}px` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
