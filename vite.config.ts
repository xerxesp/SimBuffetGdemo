import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Bundles all JS, CSS, fonts, and imported images (as base64 data URIs)
      // directly into dist/index.html so opening it offline via file:// works
      // with zero CORS errors or blank pages.
      viteSingleFile({
        removeViteModuleLoader: true,
      }),
      // Ensures no stray crossorigin attribute remains on HTML script/link tags
      // when opened locally via file:// protocol without touching inline JS code.
      {
        name: 'strip-file-protocol-crossorigin',
        apply: 'build',
        enforce: 'post',
        transformIndexHtml(html: string): string {
          return html
            .replace(/<link[^>]*rel="modulepreload"[^>]*>/gi, '')
            .replace(
              /<(script|link)\b([^>]*?)\s+crossorigin(?:="[^"]*")?([^>]*)>/gi,
              '<$1$2$3>'
            );
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    build: {
      target: 'es2020',
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      modulePreload: false,
      chunkSizeWarningLimit: 20_000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
