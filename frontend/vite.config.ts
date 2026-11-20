import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves from /<repo>/ → build with VITE_BASE=/VIDRAPRO/
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // Consume the engine from source: same code runs in the browser (live preview) and on the API (authoritative).
    alias: { '@vidrapro/engine': fileURLToPath(new URL('../packages/engine/src/index.ts', import.meta.url)) },
  },
  server: { port: 5173 },
});
