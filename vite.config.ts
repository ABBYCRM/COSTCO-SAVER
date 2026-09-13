import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'COSTCO-SAVER',
        short_name: 'COSTCO-SAVER',
        description:
          'Price intelligence for Costco. Pin a warehouse, scan a barcode, see the real clearance markdowns in your area — with confidence, freshness, and consensus from real observations.',
        theme_color: '#0B1220',
        background_color: '#0B1220',
        display: 'standalone',
        orientation: 'portrait',
        // GH Pages subpath hosting. Override the default scope/start_url to
        // /COSTCO-SAVER/ so the installed PWA opens the app, not the GH Pages
        // root. Override GH_PAGES_BASE at build time for custom domains.
        scope: process.env.GH_PAGES_BASE || '/COSTCO-SAVER/',
        start_url: process.env.GH_PAGES_BASE || '/COSTCO-SAVER/',
        categories: ['shopping', 'utilities', 'finance'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell + core chunks. Supabase calls are runtime
        // network-only; static assets get cache-first.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/assets\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'costco-saver-assets-v1',
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.host.endsWith('.supabase.co') || url.pathname.startsWith('/rest/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'costco-saver-api-v1',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // don't generate sw during dev — keeps HMR clean
      },
    }),
  ],
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
