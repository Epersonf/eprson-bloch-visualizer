import { useEffect } from 'react';
import type { DebuggerStore } from '../store/DebuggerStore';

export function useDebuggerShortcuts(store: DebuggerStore): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');

      if (e.key === 'F10' && !e.shiftKey) { e.preventDefault(); store.step(); return; }
      if (e.key === 'F10' && e.shiftKey) { e.preventDefault(); store.stepBack(); return; }
      if (e.key === 'F5') { e.preventDefault(); store.continueRun(); return; }
      if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); store.resetRun(); return; }
      if (typing) return; // let the editor own plain letters below

      if (e.key === 'j') { e.preventDefault(); store.step(); return; }
      if (e.key === 'k') { e.preventDefault(); store.stepBack(); return; }
      if (e.key === 'r' && store.current?.lastOutcome) { e.preventDefault(); store.rerollMeasurement(); return; }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);
}
