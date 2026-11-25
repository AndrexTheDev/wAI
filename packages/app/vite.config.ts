import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@wai/shared': path.resolve(import.meta.dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4174,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
});
