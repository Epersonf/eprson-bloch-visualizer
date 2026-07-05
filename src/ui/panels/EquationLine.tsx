import { observer } from 'mobx-react-lite';
import type { Mat2 } from '../../core/gates/matrices';
import { formatEquation } from '../../core/analysis/formats';
import { useDebuggerStore } from '../../store/StoreContext';

interface Props { qubit: number; rho: Mat2; }

export const EquationLine = observer(function EquationLine({ qubit, rho }: Props) {
  const store = useDebuggerStore();
  const format = store.getEquationFormat(qubit);
  const eq = formatEquation(rho, format);

  function copyLatex(e: React.MouseEvent) {
    e.preventDefault();
    navigator.clipboard?.writeText(eq.latex).catch(() => {});
  }

  return (
    <div
      className="equation-line"
      onClick={() => store.cycleEquationFormat(qubit)}
      onContextMenu={copyLatex}
      title="clique para alternar formato; botão direito copia LaTeX"
    >
      {eq.text}
    </div>
  );
});
