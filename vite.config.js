import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  server: { port: 5174, strictPort: true, proxy: { '/api': 'http://localhost:3000' } },
  plugins: [
    react(), 
    tailwindcss(),
  ],
})
