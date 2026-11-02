import react from '@vitejs/plugin-react'
import { defineConfig, transformWithEsbuild, type Plugin } from 'vite'

// rFactor 2 renders the UI with CEF 75 (Chromium 75).
const TARGET = 'chrome75'
const GAME = 'http://localhost:5397'
const DEV_PORT = 5173

/**
 * Vite's dev server ships modern syntax (its own client, the React refresh runtime, and our modules,
 * which esbuild only strips types from). Lower everything to Chromium 75 so dev mode runs in the game.
 */
function downlevelForGame(): Plugin {
  return {
    name: 'rf2ui:downlevel',
    apply: 'serve',
    enforce: 'post',
    async transform(code, id) {
      const path = id.split('?')[0]
      if (!/\.[cm]?[jt]sx?$/.test(path) && !id.includes('@react-refresh')) return
      if (path.includes('/.vite/deps/')) return // pre-bundled with optimizeDeps target below
      const result = await transformWithEsbuild(code, path, { loader: 'js', target: TARGET, format: 'esm', sourcemap: true })
      return { code: result.code, map: result.map }
    },
  }
}

export default defineConfig({
  // Served by the bundle at /rf2ui/* (and by the dev server at the same path).
  base: '/rf2ui/',
  build: {
    target: TARGET,
    rollupOptions: {
      input: { index: 'src/main.tsx' },
      output: {
        // Fixed names: the start page in bundle/static/start/index.html loads assets/index.{js,css}.
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: { target: TARGET },
  },
  plugins: [react(), downlevelForGame()],
  server: {
    port: DEV_PORT,
    strictPort: true,
    // The game page (localhost:5397) loads modules from here; asset URLs must point back here too.
    origin: `http://localhost:${DEV_PORT}`,
    // Browser dev (http://localhost:5173/rf2ui/): forward API calls to the running game.
    proxy: {
      '/rest': { target: GAME, ws: true },
      '/navigation': GAME,
    },
  },
})
