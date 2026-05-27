import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const editorDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@agents-team/service': resolve(editorDirectory, '../service/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    fs: {
      allow: [resolve(editorDirectory, '..')],
    },
  },
});