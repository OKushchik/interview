import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // .env лишається в корені репозиторію (поруч із .env.example)
  envDir: '..',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // OpenAI prepare/report can take 30–60s; default proxy timeouts cause ECONNRESET
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
})
