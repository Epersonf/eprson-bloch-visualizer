export interface SerializedState {
  source: string;
  seed: number;
  measurementMode: 'SAMPLE' | 'ASK' | { fixed: (0 | 1)[] };
  breakpoints: number[];
  exampleId?: string;
}

function toBase64Url(str: string): string {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): string {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

export function encodeState(s: SerializedState): string {
  return toBase64Url(JSON.stringify(s));
}

export function decodeState(encoded: string): SerializedState | null {
  try {
    const json = fromBase64Url(encoded);
    const obj = JSON.parse(json);
    if (typeof obj.source !== 'string') return null;
    return obj as SerializedState;
  } catch {
    return null;
  }
}

export const AUTOSAVE_KEY = 'eprson:autosave:v1';

export function saveToLocalStorage(s: SerializedState): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable (private mode / quota) — silently skip, URL param still works
  }
}

export function loadFromLocalStorage(): SerializedState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedState;
  } catch {
    return null;
  }
}
