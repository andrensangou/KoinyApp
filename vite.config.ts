
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('canvas-confetti')) {
              return 'confetti';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
