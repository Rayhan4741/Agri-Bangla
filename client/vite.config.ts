/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

// `npm run build` → normal multi-file static build (dist/), deployable anywhere.
// `npm run build:preview` (mode "singlefile") → one self-contained HTML file for quick sharing.
export default defineConfig(({ mode }) => ({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react(), ...(mode === 'singlefile' ? [viteSingleFile()] : [])],
  // dev: forward API calls to the Express server (npm run dev in server/)
  server: { proxy: { '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:5000', changeOrigin: false } } },
  build: {
    outDir: mode === 'singlefile' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 1200,
    rollupOptions:
      mode === 'singlefile'
        ? undefined
        : {
            output: {
              manualChunks: {
                three: ['three', '@react-three/fiber', '@react-three/drei'],
                charts: ['recharts'],
                motion: ['framer-motion'],
              },
            },
          },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
