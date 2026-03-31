import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'

const root = process.cwd()

// ── Output filename strategy ───────────────────────────────────────────────────
// electron-vite derives the output filename from the entry filename when using
// build.lib.entry.  "electron/main.ts" → "main.js" (not "index.js").
//
// We need the output to be "index.js" because:
//   • package.json "main" field points to "out/main/index.js"
//   • main.ts preload path resolves to "out/preload/index.js"
//
// Additionally, Electron 29 causes electron-vite to default to ES module output
// ("index.mjs"), which also wouldn't match the "index.js" package.json main.
//
// Fix: use rollupOptions.input with a named key { index: '...' } so rollup
// calls the chunk "index", and force CJS format so the extension stays ".js".
const mainOutput = {
  format: 'cjs' as const,
  entryFileNames: '[name].js',  // "index" key → "index.js"
  chunkFileNames: '[name].js',
}

export default defineConfig({
  // ── Electron main process → out/main/index.js ──────────────────────────────
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { index: join(root, 'electron/main.ts') },
        output: mainOutput,
      },
    },
  },

  // ── Preload script → out/preload/index.js ─────────────────────────────────
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { index: join(root, 'electron/preload.ts') },
        output: mainOutput,
      },
    },
  },

  // ── React renderer (Vite dev server in dev mode) ───────────────────────────
  renderer: {
    root: root,
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: join(root, 'index.html'),
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': join(root, 'src'),
      },
    },
    server: {
      port: 5173,
    },
  },
})
