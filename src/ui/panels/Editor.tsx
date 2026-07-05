import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useDebuggerStore } from '../../store/StoreContext';

const LINE_HEIGHT = 20; // must match --line-height in the CSS (.gutter-line / .editor-textarea)

export const Editor = observer(function Editor() {
  const store = useDebuggerStore();
  const [localSource, setLocalSource] = useState(store.source);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setLocalSource(store.source), [store.source]);

  // Auto-scroll to keep the current (paused) line visible
  useEffect(() => {
    const currentLine = store.currentLine;
    if (currentLine == null || !taRef.current || !gutterRef.current) return;
    const targetScrollTop = (currentLine - 1) * LINE_HEIGHT;
    const ta = taRef.current;
    const maxScroll = ta.scrollHeight - ta.clientHeight;
    const clamped = Math.max(0, Math.min(targetScrollTop, maxScroll));
    if (Math.abs(ta.scrollTop - clamped) > 2) {
      ta.scrollTop = clamped;
      // the gutter follows via onScroll
    }
  }, [store.currentLine]);

  function onChange(v: string) {
    setLocalSource(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => store.setSource(v), 150);
  }

  function onScroll() {
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
      setScrollTop(taRef.current.scrollTop);
    }
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
          line {store.parseErrors[0].line}: {store.parseErrors[0].message}
          {store.parseErrors[0].hint ? ` — ${store.parseErrors[0].hint}` : ''}
        </div>
      )}
      {store.parseErrors.length === 0 && store.parseWarnings.length > 0 && (
        <div className="parse-warning-banner">
          line {store.parseWarnings[0].line}: {store.parseWarnings[0].message}
        </div>
      )}
      <div className="editor-wrap" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div className="gutter" ref={gutterRef} style={{ overflow: 'hidden' }}>
          {lines.map((_, idx) => {
            const lineNo = idx + 1;
            const hasBp = store.breakpoints.has(lineNo);
            const isCurrent = currentLine === lineNo;
            const hasError = errorLines.has(lineNo);
            const hasWarning = warningLines.has(lineNo);
            const tooltip = isCurrent
              ? 'Execution is paused here (current instruction) — click to toggle breakpoint'
              : hasError
                ? 'parse error'
                : hasWarning
                  ? 'warning'
                  : 'click to toggle breakpoint';
            return (
              <div
                key={lineNo}
                className={`gutter-line ${isCurrent ? 'current' : ''}`}
                onClick={() => store.toggleBreakpoint(lineNo)}
                onContextMenu={(e) => onGutterContextMenu(e, lineNo)}
                onMouseEnter={() => setHoveredLine(lineNo)}
                onMouseLeave={() => setHoveredLine((l) => (l === lineNo ? null : l))}
                title={tooltip}
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
          style={{ overflowY: 'auto' }}
          spellCheck={false}
          value={localSource}
          onScroll={onScroll}
          onChange={(e) => onChange(e.target.value)}
        />
        {hoveredLine != null && hoveredLine !== currentLine && (
          <div
            className="hover-line-overlay"
            style={{ top: (hoveredLine - 1) * LINE_HEIGHT - scrollTop }}
          />
        )}
        {currentLine != null && (
          <div
            className="current-line-overlay"
            title="Execution is paused here (current instruction)"
            style={{ top: (currentLine - 1) * LINE_HEIGHT - scrollTop }}
          />
        )}
      </div>
    </div>
  );
});
