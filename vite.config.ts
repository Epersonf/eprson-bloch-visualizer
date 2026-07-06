import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// GitHub Pages hard-codes `Cache-Control: max-age=600` on everything it serves and gives us no
// way to override it, so after a deploy, visitors' browsers (and the CDN edge) can keep serving
// the previous index.html — pointing at the previous build's hashed JS/CSS — for up to 10 minutes.
// To work around that: stamp this build with an ID, and emit a small build-id.json file that
// src/ui/VersionWatcher.tsx polls with a cache-busting query param to detect and prompt a reload
// when a newer build has actually gone live.
const BUILD_ID = String(Date.now());

function buildIdFilePlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'eprson-build-id-file',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      writeFileSync(resolve(outDir, 'build-id.json'), JSON.stringify({ buildId: BUILD_ID }));
    },
  };
}

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/, so the app
// needs to know that subpath both for asset URLs (this `base`) and for React Router's
// basename (read at runtime from import.meta.env.BASE_URL, see src/App.tsx). The deploy
// workflow sets VITE_BASE_PATH to "/<repo>/"; everywhere else (local dev/build) it's "/".
export default defineConfig({
  plugins: [react(), buildIdFilePlugin()],
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
});
