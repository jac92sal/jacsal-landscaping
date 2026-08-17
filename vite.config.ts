import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Runs the Worker in the real workerd runtime during `vite dev`, with the
    // actual D1/KV/R2 bindings — so local behaviour matches production instead
    // of a mock. Reads wrangler.jsonc; do not also set `assets.directory` there.
    cloudflare(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
