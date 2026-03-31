import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',  // Root path for Netlify
  plugins: [react(), tailwindcss()],
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      'process': 'process/browser',
      'buffer': 'buffer',
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})
