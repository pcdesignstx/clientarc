import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
        }
      }
    }
  },
  server: {
    historyApiFallback: true,
    watch: {
      usePolling: true
    },
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval';
        style-src 'self' 'unsafe-inline';
        font-src 'self' data:;
        img-src 'self' data: blob:;
        connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.cloudfunctions.net;
        frame-src 'self';
        worker-src 'self' blob:;
      `.replace(/\s+/g, ' ').trim()
    }
  },
  optimizeDeps: {
    include: ['@heroicons/react/24/outline']
  },
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  }
})
