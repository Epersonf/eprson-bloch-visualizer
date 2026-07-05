import { observer } from 'mobx-react-lite';
import { useDebuggerStore } from '../../store/StoreContext';

export const LogPanel = observer(function LogPanel() {
  const store = useDebuggerStore();
  return (
    <div className="log-panel">
      {store.log.length === 0 && <div className="empty-state">no events yet</div>}
      {store.log.slice().reverse().map((line, i) => <div key={i}>{line}</div>)}
    </div>
  );
});
