import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Header } from './ui/panels/Header';
import { DebuggerPage } from './ui/pages/DebuggerPage';
import { AboutPage } from './ui/pages/AboutPage';

export function App() {
  return (
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="app-root">
          <Header />
          <Routes>
            <Route path="/" element={<DebuggerPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </StoreProvider>
  );
}
