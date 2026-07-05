import { createContext, useContext, type ReactNode } from 'react';
import { debuggerStore, DebuggerStore } from './DebuggerStore';

const StoreContext = createContext<DebuggerStore>(debuggerStore);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <StoreContext.Provider value={debuggerStore}>{children}</StoreContext.Provider>;
}

export function useDebuggerStore(): DebuggerStore {
  return useContext(StoreContext);
}
