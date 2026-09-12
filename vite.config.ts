import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@stores': path.resolve(__dirname, 'src/stores'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Keep react-router + @ionic/react-router in the SAME chunk.
        // They have a circular dep (Ionic's react-router re-exports from
        // react-router-dom; react-router-dom uses some Ionic internals).
        // Splitting them across vendor/ionic chunks produced a TDZ error
        // "Cannot access 'w' before initialization" at boot.
        // Verified 2026-09-12 — see agent memory COSTCO-SAVER entry.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router', 'react-router-dom', '@ionic/react', '@ionic/react-router'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
