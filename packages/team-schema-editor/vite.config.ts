import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const editorDirectory = fileURLToPath(new URL('.', import.meta.url));
const exposeDevServer = process.env.VITE_EDITOR_EXPOSE_HOST === 'true';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@agents-team/service': resolve(editorDirectory, '../service/src'),
    },
  },
  server: {
    host: exposeDevServer ? '0.0.0.0' : 'localhost',
    fs: {
      allow: [resolve(editorDirectory, '..')],
    },
  },
});