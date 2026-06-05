import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync } from 'fs';

export default defineConfig({
  root: 'src',
  base: '/',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content-script': resolve(__dirname, 'src/content/cayuse-scraper.ts'),
        'sidepanel/index': resolve(__dirname, 'src/sidepanel/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    target: 'esnext',
    minify: false,
    // No source maps in the shipped artifact: keeps the Web Store zip small and
    // avoids publishing original TypeScript source paths. Code stays unminified,
    // so it remains review-friendly without maps.
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    {
      name: 'copy-extension-files',
      closeBundle() {
        cpSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );
        try {
          cpSync(
            resolve(__dirname, 'src/assets'),
            resolve(__dirname, 'dist/assets'),
            // Ship only the rasterized PNG icons; the icon.svg is design source
            // (referenced by no manifest field) and should not be packaged.
            { recursive: true, filter: (src) => !src.toLowerCase().endsWith('.svg') }
          );
        } catch {
          // Assets may not exist yet
        }
      },
    },
  ],
});
