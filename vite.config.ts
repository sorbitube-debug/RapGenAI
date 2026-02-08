import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
  const env = loadEnv(mode, cwd, '');
  return {
    plugins: [react()],
    define: {
      // This allows process.env to work in the client-side code
      'process.env': JSON.stringify(env)
    },
    build: {
      outDir: 'dist',
    }
  };
});