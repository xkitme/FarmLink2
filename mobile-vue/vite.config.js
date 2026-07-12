import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
import path from 'node:path'

export default defineConfig({
  // Capacitor 从 APK 内部加载静态文件，资源地址必须相对于 index.html。
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
  },
})
