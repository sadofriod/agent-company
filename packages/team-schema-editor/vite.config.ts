import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const editorDirectory = fileURLToPath(new URL('.', import.meta.url));
const exposeDevServer = process.env.VITE_EDITOR_EXPOSE_HOST === 'true';
const serviceOrigin = process.env.VITE_SERVICE_ORIGIN ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@agents-team/service': resolve(editorDirectory, '../service/src'),
    },
  },
  server: {
    host: exposeDevServer ? '0.0.0.0' : 'localhost',
    proxy: {
      '/agent-markdown': {
        target: serviceOrigin,
        changeOrigin: true,
      },
      '/team/schema': {
        target: serviceOrigin,
        changeOrigin: true,
      },
      '/team/schemas': {
        target: serviceOrigin,
        changeOrigin: true,
      },
      '/team/validate': {
        target: serviceOrigin,
        changeOrigin: true,
      },
      '/runtime-plan': {
        target: serviceOrigin,
        changeOrigin: true,
      },
      '/agent-gateway': {
        target: serviceOrigin,
        changeOrigin: true,
      },
      '/runtime/session': {
        target: serviceOrigin,
        changeOrigin: true,
      },
    },
    fs: {
      allow: [resolve(editorDirectory, '..')],
    },
  },
});