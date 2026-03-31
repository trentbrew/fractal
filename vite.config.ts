import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: __dirname,
  server: {
    port: 8901,
    host: true,
    allowedHosts: ['fractal-ui-bnsoz.sprites.app'],
    proxy: {
      '/ws': {
        target: 'ws://localhost:8089',
        ws: true,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
