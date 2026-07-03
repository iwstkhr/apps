/// <reference types="vitest/config" />
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const base =
  process.env.NODE_ENV === 'production' && process.env.BASE_PATH ? process.env.BASE_PATH : '/'

export default defineConfig({
  base,
  plugins: process.env.VITEST ? [tailwindcss()] : [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    setupFiles: ['./app/test/setup.ts'],
    include: ['app/**/*.{test,spec}.{ts,tsx}'],
  },
})
