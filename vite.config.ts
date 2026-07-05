import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const appBase = '/barcode-scanner/';

export default defineConfig({
  base: appBase,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
        suppressWarnings: true,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,webmanifest,woff2}'],
      },
      manifest: {
        name: 'Webcam 條碼掃描器',
        short_name: '條碼掃描器',
        description: '使用電腦 Webcam 即時掃描條碼，支援 Code 128、Code 39、EAN-13 等格式，可匯出 CSV。',
        lang: 'zh-TW',
        start_url: appBase,
        scope: appBase,
        theme_color: '#0B0F1A',
        background_color: '#0B0F1A',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          }
        ],
      },
    }),
  ],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('qrcode')) return 'qrcode';
          if (id.includes('jsbarcode')) return 'jsbarcode';
          if (id.includes('barcode-detector')) return 'detector';
        }
      }
    }
  },
});
