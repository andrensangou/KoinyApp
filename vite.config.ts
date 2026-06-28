
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/screenshots/**', '**/.agent/**', '**/.agents/**', '**/.claude/**', '**/ios/**', '**/docs/**']
    }
  },
  resolve: {
    alias: {
      // Stub firebase/analytics so @capacitor-firebase/analytics web.js doesn't
      // break at runtime — on native Android the native SDK handles everything.
      'firebase/analytics': resolve(__dirname, 'src/firebase-analytics-stub.ts'),
      // Idem pour firebase/messaging (utilisé par @capacitor-firebase/messaging web.js).
      // Sur natif iOS/Android, le SDK Firebase natif gère le push — le web n'est jamais exécuté.
      'firebase/messaging': resolve(__dirname, 'src/firebase-messaging-stub.ts'),
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
    exclude: ['screenshots', '@capacitor-firebase/analytics', '@capacitor-firebase/messaging']
  }
})
