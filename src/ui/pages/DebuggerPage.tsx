import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import { useSearchParams } from 'react-router-dom';
import { useDebuggerStore } from '../../store/StoreContext';
import { useDebuggerShortcuts } from '../../keys/shortcuts';
import { encodeState } from '../../core/serialize';
import { Header } from '../panels/Header';
import { GatePalette } from '../panels/GatePalette';
import { Editor } from '../panels/Editor';
import { Timeline } from '../panels/Timeline';
import { QubitCard } from '../panels/QubitCard';
import { BottomPanel } from '../panels/BottomPanel';
import { ContextMenu } from '../panels/ContextMenu';
import { MeasurementPrompt } from '../panels/MeasurementPrompt';

export const DebuggerPage = observer(function DebuggerPage() {
  const store = useDebuggerStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const bootstrapped = useRef(false);

  useDebuggerShortcuts(store);

  // Hydrate once on mount: URL param > localStorage > default example.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    store.bootstrap(searchParams.get('s'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatic serialization: every relevant store change is mirrored to the URL (?s=...)
  // and localStorage, debounced, via a MobX reaction — no explicit "save" action needed.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const dispose = reaction(
      () => store.serialized,
      (serialized) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          store.persist();
          const encoded = encodeState(serialized);
          setSearchParams({ s: encoded }, { replace: true });
        }, 400);
      },
      { fireImmediately: false },
    );
    return () => { dispose(); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="main-grid">
      <GatePalette />
      <div className="content">
        <div className="pane">
          <div className="tabs">
            <button className={store.editorTab === 'EDITOR' ? 'active' : ''} onClick={() => store.setEditorTab('EDITOR')}>EDITOR</button>
            <button className={store.editorTab === 'TIMELINE' ? 'active' : ''} onClick={() => store.setEditorTab('TIMELINE')}>TIMELINE</button>
          </div>
          <div className="pane-body">
            {store.editorTab === 'EDITOR' ? <Editor /> : <Timeline />}
          </div>
        </div>
        <div className="pane">
          <div className="qubit-cards">
            {store.numQubits === 0 && <div className="empty-state">load an example or declare "qubits N"</div>}
            {Array.from({ length: store.numQubits }, (_, q) => <QubitCard key={q} qubit={q} />)}
          </div>
        </div>
        <BottomPanel />
      </div>
      <MeasurementPrompt />
      <ContextMenu />
    </div>
  );
});
