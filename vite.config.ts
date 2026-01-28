
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Standard public directory is 'public', but since we use root, 
  // we ensure only specific files are handled to prevent loops.
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  }
})
