import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
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
