import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PROXY_PORT = process.env.MARKET_PROXY_PORT || '8787';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/market': { target: `http://localhost:${PROXY_PORT}`, changeOrigin: true },
    },
  },
});
