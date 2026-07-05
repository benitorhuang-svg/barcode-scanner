import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/barcode-scanner/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        suppressWarnings: true,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
      },
      manifest: {
        name: 'Webcam 條碼掃描器',
        short_name: '條碼掃描器',
        description: '使用電腦 Webcam 即時掃描條碼，支援 Code 128、Code 39、EAN-13 等格式，可匯出 CSV。',
        theme_color: '#0B0F1A',
        background_color: '#0B0F1A',
        display: 'standalone',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
  }
});
