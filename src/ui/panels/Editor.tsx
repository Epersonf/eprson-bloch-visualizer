import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useDebuggerStore } from '../../store/StoreContext';

export const Editor = observer(function Editor() {
  const store = useDebuggerStore();
  const [localSource, setLocalSource] = useState(store.source);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setLocalSource(store.source), [store.source]);

  function onChange(v: string) {
    setLocalSource(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => store.setSource(v), 150);
  }

  function onScroll() {
    if (gutterRef.current && taRef.current) gutterRef.current.scrollTop = taRef.current.scrollTop;
  }

  const lines = localSource.split(/\r\n|\n/);
  const currentLine = store.currentLine;
  const errorLines = new Set(store.parseErrors.map((e) => e.line));
  const warningLines = new Set(store.parseWarnings.map((w) => w.line));

  function instructionAtLine(lineNo: number) {
    return store.program.find((i) => i.line === lineNo);
  }

  function onGutterContextMenu(e: React.MouseEvent, lineNo: number) {
    e.preventDefault();
    const instr = instructionAtLine(lineNo);
    if (instr) store.openContextMenu(e.clientX, e.clientY, instr);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {store.parseErrors.length > 0 && (
        <div className="parse-error-banner">
          linha {store.parseErrors[0].line}: {store.parseErrors[0].message}
          {store.parseErrors[0].hint ? ` — ${store.parseErrors[0].hint}` : ''}
        </div>
      )}
      {store.parseErrors.length === 0 && store.parseWarnings.length > 0 && (
        <div className="parse-warning-banner">
          linha {store.parseWarnings[0].line}: {store.parseWarnings[0].message}
        </div>
      )}
      <div className="editor-wrap">
        <div className="gutter" ref={gutterRef}>
          {lines.map((_, idx) => {
            const lineNo = idx + 1;
            const hasBp = store.breakpoints.has(lineNo);
            const isCurrent = currentLine === lineNo;
            const hasError = errorLines.has(lineNo);
            const hasWarning = warningLines.has(lineNo);
            return (
              <div
                key={lineNo}
                className="gutter-line"
                onClick={() => store.toggleBreakpoint(lineNo)}
                onContextMenu={(e) => onGutterContextMenu(e, lineNo)}
                title={hasError ? 'erro de parse' : hasWarning ? 'aviso' : 'clique para breakpoint'}
              >
                <span>{lineNo}</span>
                <span className={`bp-dot ${hasBp ? '' : 'empty'}`} style={hasError ? { background: '#ff4d4d' } : hasWarning ? { background: '#ffd23f' } : undefined} />
                <span className="pc-arrow">{isCurrent ? '▶' : ''}</span>
              </div>
            );
          })}
        </div>
        <textarea
          ref={taRef}
          className="editor-textarea"
          spellCheck={false}
          value={localSource}
          onScroll={onScroll}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
});
