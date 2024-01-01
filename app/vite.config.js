import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
dotenv.config()

export default {
  preview: {
    port: process.env.VITE_APP_PORT
  },
  server: {
    port: process.env.VITE_APP_PORT,
    proxy: {
      '/api': {
        target: process.env.VITE_API_HOST,
        changeOrigin: true
      },
      '/socket.io': {
        target: process.env.VITE_SOCKET_IO_URL,
        ws: true,
        changeOrigin: true
      }
    }
  },
  resolve: {
    // eslint-disable-next-line no-undef
    alias: [{ find: '@', replacement: resolve(__dirname, './src') }]
  },
  build: {
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  },
  plugins: [vue()]
}
