import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/, so the app
// needs to know that subpath both for asset URLs (this `base`) and for React Router's
// basename (read at runtime from import.meta.env.BASE_URL, see src/App.tsx). The deploy
// workflow sets VITE_BASE_PATH to "/<repo>/"; everywhere else (local dev/build) it's "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
});
