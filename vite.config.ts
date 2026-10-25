import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the site at /<repo-name>/
const base = process.env.GITHUB_PAGES ? '/FNB-App-Of-The-Year-Financial-Inclusion-and-Money-Confidence/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Madi — safe to spend',
        short_name: 'Madi',
        description: 'Know what is safe to spend today, even when your income is irregular.',
        theme_color: '#1d5c4a',
        background_color: '#f6f4ee',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
})
