import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// a api so libera cors para a porta 5500 em desenvolvimento
const servidor = { port: 5500, strictPort: true }

export default defineConfig({
  plugins: [react()],
  server: servidor,
  preview: servidor,
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/teste/configurar.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
