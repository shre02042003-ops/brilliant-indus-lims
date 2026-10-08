import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@react-pdf/renderer"],
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      "130665d3f813d4c1d92f-pod-bnz4tsib5fa75ppeoqwmijbtvu-5173.us4.cursorvm.com",
      ".cursorvm.com",
    ],
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), "C:/Windows/Fonts"],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
