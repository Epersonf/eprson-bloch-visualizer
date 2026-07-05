import { observer } from 'mobx-react-lite';
import { getQubitDerived } from '../../core/analysis/selectors';
import { angularForm } from '../../core/analysis/bloch';
import { formatAngle } from '../../core/analysis/formats';
import { BlochCanvas } from './BlochCanvas';
import { EquationLine } from './EquationLine';
import { useDebuggerStore } from '../../store/StoreContext';

const QUBIT_COLORS = ['#8f88ff', '#35d49a', '#ff7a4d', '#ff6bd6', '#4db8ff', '#d2ff4d'];

function bar(p: number, width = 10): string {
  const filled = Math.round(p * width);
  return '▓'.repeat(filled) + '░'.repeat(width - filled);
}

interface Props { qubit: number; }

export const QubitCard = observer(function QubitCard({ qubit }: Props) {
  const store = useDebuggerStore();
  const snap = store.current;
  if (!snap) return null;
  const derived = getQubitDerived(snap.state, qubit);
  const color = QUBIT_COLORS[qubit % QUBIT_COLORS.length];
  const { theta, phi } = angularForm(derived.bloch);
  const len = Math.sqrt(derived.bloch.x ** 2 + derived.bloch.y ** 2 + derived.bloch.z ** 2);

  return (
    <div className="qubit-card">
      <div className="title-row">
        <span style={{ color }}>q{qubit}</span>
        <span className={`badge ${derived.pure ? 'pure' : 'mixed'}`}>{derived.pure ? 'PURE' : 'MIXED'}</span>
        <span className="badge">ENT {derived.entropy.toFixed(2)}</span>
      </div>
      <BlochCanvas bloch={derived.bloch} entropy={derived.entropy} color={color} />
      <EquationLine qubit={qubit} rho={derived.rho} />
      <div className="prob-bars">
        <div className="prob-bar-row">
          <span>P(0)</span>
          <span className="bar">{bar(derived.p0)}</span>
          <span>{derived.p0.toFixed(4)}</span>
        </div>
        <div className="prob-bar-row">
          <span>P(1)</span>
          <span className="bar">{bar(derived.p1)}</span>
          <span>{derived.p1.toFixed(4)}</span>
        </div>
      </div>
      <div className="theta-phi-line">
        θ={formatAngle(theta)} φ={derived.relativePhase == null ? '—' : formatAngle(phi)} |r|={len.toFixed(3)}
      </div>
    </div>
  );
});
