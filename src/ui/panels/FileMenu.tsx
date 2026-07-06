import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useDebuggerStore } from '../../store/StoreContext';
import { programToQiskit } from '../../core/export/toQiskit';
import { programToCirq } from '../../core/export/toCirq';
import { serializeProjectFile, parseProjectFile, PROJECT_FILE_EXTENSION, PROJECT_MIME_TYPE } from '../../core/export/projectFile';
import {
  hasFileSystemAccess, pickSaveFile, pickOpenFile, writeToHandle, downloadBlob,
  type FileHandle,
} from '../files/fileAccess';

type ExportKind = 'qiskit' | 'cirq' | 'project';

const EXPORT_ROWS: { kind: ExportKind; label: string; extension: string; mime: string }[] = [
  { kind: 'qiskit', label: 'IBM Qiskit', extension: 'py', mime: 'text/x-python' },
  { kind: 'cirq', label: 'Google Cirq', extension: 'py', mime: 'text/x-python' },
  { kind: 'project', label: `EPRson project (.${PROJECT_FILE_EXTENSION})`, extension: PROJECT_FILE_EXTENSION, mime: PROJECT_MIME_TYPE },
];

export const FileMenu = observer(function FileMenu() {
  const store = useDebuggerStore();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExportKind | null>(null);
  const [anchor, setAnchor] = useState<{ right: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // remembers the file the user picked for each export kind, so a repeat save overwrites
  // that same file on disk directly instead of prompting a fresh "save as" every time
  const handlesRef = useRef<Partial<Record<ExportKind, FileHandle>>>({});

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // anchor from the right edge — the button sits near the right side of the header,
      // so a left-anchored dropdown would overflow off the viewport edge
      setAnchor({ right: window.innerWidth - rect.right, top: rect.bottom + 4 });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) { setExpanded(null); return; }
    // the dropdown is position:fixed (see below — .header has overflow-x:auto, which per the
    // CSS spec forces overflow-y:auto too, and would clip an absolutely-positioned dropdown),
    // so clicks inside it land outside rootRef; check the dropdown's own ref as well.
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  function textFor(kind: ExportKind): string {
    if (kind === 'qiskit') return programToQiskit(store.program, store.numQubits, store.numBits);
    if (kind === 'cirq') return programToCirq(store.program, store.numQubits);
    return serializeProjectFile(store.serialized);
  }

  async function copy(kind: ExportKind) {
    await navigator.clipboard?.writeText(textFor(kind)).catch(() => {});
    store.appendLog(`copied ${kind} to clipboard`);
    setOpen(false);
  }

  async function save(kind: ExportKind) {
    const row = EXPORT_ROWS.find((r) => r.kind === kind)!;
    const text = textFor(kind);

    if (hasFileSystemAccess()) {
      try {
        let handle = handlesRef.current[kind];
        if (!handle) {
          const picked = await pickSaveFile({
            suggestedName: `circuit.${row.extension}`,
            types: [{ description: row.label, accept: { [row.mime]: [`.${row.extension}`] } }],
          });
          if (!picked) { setOpen(false); return; } // user cancelled
          handle = picked;
          handlesRef.current[kind] = handle;
        }
        await writeToHandle(handle, text);
        store.appendLog(`saved ${kind} to ${handle.name}`);
      } catch (err) {
        store.appendLog(`save failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      downloadBlob(text, `circuit.${row.extension}`, row.mime);
      store.appendLog(`downloaded ${kind} as circuit.${row.extension}`);
    }
    setOpen(false);
  }

  function applyImportedText(text: string) {
    const parsed = parseProjectFile(text);
    if (!parsed) { store.appendLog(`import failed: not a valid .${PROJECT_FILE_EXTENSION} file`); return; }
    store.hydrate(parsed);
    store.appendLog('project imported');
  }

  async function doImport() {
    if (hasFileSystemAccess()) {
      const handle = await pickOpenFile({
        types: [{ description: 'EPRson project', accept: { [PROJECT_MIME_TYPE]: [`.${PROJECT_FILE_EXTENSION}`] } }],
      });
      if (!handle) { setOpen(false); return; } // user cancelled
      const file = await handle.getFile();
      applyImportedText(await file.text());
      // editing this same imported file on later saves, instead of always prompting a new one
      handlesRef.current.project = handle;
    } else {
      fileInputRef.current?.click();
      return; // onFileInputChange closes the menu once a file is actually chosen
    }
    setOpen(false);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setOpen(false);
    if (!file) return;
    file.text().then(applyImportedText);
  }

  return (
    <div className="file-menu" ref={rootRef}>
      <button ref={buttonRef} onClick={toggleOpen} title="Export the circuit or import a project file">FILE ▾</button>
      {open && anchor && (
        <div className="file-menu-dropdown" ref={dropdownRef} style={{ right: anchor.right, top: anchor.top }}>
          <div className="file-menu-section-title">EXPORT</div>
          {EXPORT_ROWS.map((row) => (
            <div key={row.kind}>
              <button
                className="file-menu-row"
                onClick={() => setExpanded(expanded === row.kind ? null : row.kind)}
              >
                {row.label}
              </button>
              {expanded === row.kind && (
                <div className="file-menu-actions">
                  <button onClick={() => copy(row.kind)}>Copy to clipboard</button>
                  <button onClick={() => save(row.kind)}>Save to file...</button>
                </div>
              )}
            </div>
          ))}
          <div className="file-menu-divider" />
          <button className="file-menu-row" onClick={doImport}>Import project...</button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={`.${PROJECT_FILE_EXTENSION}`}
        style={{ display: 'none' }}
        onChange={onFileInputChange}
      />
    </div>
  );
});
