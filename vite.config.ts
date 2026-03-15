
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/screenshots/**', '**/.agent/**', '**/.agents/**', '**/.claude/**', '**/ios/**', '**/docs/**']
    }
  },
  build: {
    chunkSizeWarningLimit: 1600,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [/^screenshots\/.*/],
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
  },
  optimizeDeps: {
    exclude: ['screenshots']
  }
})
