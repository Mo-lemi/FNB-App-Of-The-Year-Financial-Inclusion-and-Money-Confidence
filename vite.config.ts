import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the site at /<repo-name>/
const base = process.env.GITHUB_PAGES ? '/FNB-App-Of-The-Year-Financial-Inclusion-and-Money-Confidence/' : '/'

// Content Security Policy: the page may only load its own files and may not contact any
// other server. Added to the production build only, because the dev server injects
// inline scripts for hot reloading.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'content-security-policy',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
    },
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
