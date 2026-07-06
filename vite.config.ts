/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // separa bibliotecas grandes em chunks próprios (cache entre deploys +
    // carregamento sob demanda das libs de export/login)
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
