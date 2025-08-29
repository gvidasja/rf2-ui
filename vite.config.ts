import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  plugins: [
    react(),
    babel({
      babelConfig: {
        presets: [['@babel/preset-env', { targets: { chrome: '75' } }], '@babel/preset-react'],
        plugins: [],
      },
      filter: /node_modules\/react|node_modules\/react-dom/,
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/rest': 'http://localhost:5397',
      '/navigation': 'http://localhost:5397',
    },
  },
})
