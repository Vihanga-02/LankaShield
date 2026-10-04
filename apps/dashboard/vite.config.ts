import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  build: {
    // The Firebase SDK chunk (Auth + Firestore + Storage) is ~550 kB minified on its own.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Large libraries in their own long-cached chunks; pages are split by the router.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'mui', test: /node_modules[\\/](@mui|@emotion)/ },
          ],
        },
      },
    },
  },
});
