/**
 * Thin wrapper around the (Chromium-only) File System Access API, with a plain
 * download/file-input fallback for browsers that don't support it (Firefox, Safari).
 * Kept out of core/ since it's a browser-API concern, not simulation logic.
 */

/** The handle type is the same whether it came from the open or the save picker — it supports both. */
export interface FileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

interface FilePickerAccept {
  description: string;
  accept: Record<string, string[]>;
}

interface SavePickerOptions {
  suggestedName?: string;
  types?: FilePickerAccept[];
}

interface OpenPickerOptions {
  types?: FilePickerAccept[];
}

type WindowWithPickers = Window & {
  showSaveFilePicker?: (options?: SavePickerOptions) => Promise<FileHandle>;
  showOpenFilePicker?: (options?: OpenPickerOptions) => Promise<FileHandle[]>;
};

export function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof (window as WindowWithPickers).showSaveFilePicker === 'function';
}

/** Opens the native "save as" dialog. Returns null if the user cancels or the API is unsupported. */
export async function pickSaveFile(opts: SavePickerOptions): Promise<FileHandle | null> {
  const w = window as WindowWithPickers;
  if (!w.showSaveFilePicker) return null;
  try {
    return await w.showSaveFilePicker(opts);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return null;
    throw err;
  }
}

/** Opens the native "open file" dialog. Returns null if the user cancels or the API is unsupported. */
export async function pickOpenFile(opts: OpenPickerOptions): Promise<FileHandle | null> {
  const w = window as WindowWithPickers;
  if (!w.showOpenFilePicker) return null;
  try {
    const [handle] = await w.showOpenFilePicker(opts);
    return handle ?? null;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return null;
    throw err;
  }
}

export async function writeToHandle(handle: FileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

/** Classic <a download> blob save — the fallback path when the File System Access API isn't available. */
export function downloadBlob(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
