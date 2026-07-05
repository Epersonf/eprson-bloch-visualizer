import { observer } from 'mobx-react-lite';
import { getEntanglementGraph } from '../../core/analysis/selectors';
import { useDebuggerStore } from '../../store/StoreContext';

const QUBIT_COLORS = ['#8f88ff', '#35d49a', '#ff7a4d', '#ff6bd6', '#4db8ff', '#d2ff4d'];

export const EntGraph = observer(function EntGraph() {
  const store = useDebuggerStore();
  const snap = store.current;
  if (!snap) return <div className="empty-state">sem estado</div>;
  const n = store.numQubits;
  const edges = getEntanglementGraph(snap.state);

  const width = Math.max(240, n * 90);
  const height = 140;
  const y = height / 2;
  const positions = Array.from({ length: n }, (_, i) => ({
    x: n <= 1 ? width / 2 : 40 + (i * (width - 80)) / Math.max(1, n - 1),
    y,
  }));

  return (
    <div className="pane-body">
      <div className="ent-graph-note">
        Concurrence mede emaranhamento bipartite do par isolado; a entropia (badge ENT nos cards) mede o qubit contra todo o resto.
        Em estados GHZ, pares podem ter C=0 mesmo com entropia individual alta — emaranhamento genuinamente multipartite, não é bug.
      </div>
      <svg width={width} height={height}>
        {edges.map((e) => {
          const a = positions[e.a], b = positions[e.b];
          return (
            <g key={`${e.a}-${e.b}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#4db8ff" strokeWidth={Math.max(1, e.concurrence * 6)} />
              <text x={(a.x + b.x) / 2} y={y - 10} fill="#9a9a9a" fontSize={10} textAnchor="middle">
                C={e.concurrence.toFixed(2)}
              </text>
            </g>
          );
        })}
        {positions.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={14} fill="#111111" stroke={QUBIT_COLORS[i % QUBIT_COLORS.length]} strokeWidth={2} />
            <text x={p.x} y={p.y + 4} fill={QUBIT_COLORS[i % QUBIT_COLORS.length]} fontSize={11} textAnchor="middle">q{i}</text>
          </g>
        ))}
      </svg>
    </div>
  );
});
