import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
        ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:1420'
      }
    },
    server: {
      deps: {
        inline: [/@tauri-apps/],
      },
    },
  },
})
