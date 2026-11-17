import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file (all JS and CSS inlined) that opens by double-click.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { outDir: 'dist-single', chunkSizeWarningLimit: 4000 },
});
