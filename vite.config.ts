import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(), 
        tailwindcss(),
        {
          name: 'prioritize-server-rendered-content',
          apply: 'build',
          transformIndexHtml: {
            order: 'post',
            handler(html) {
              // Native links and the complete SSR page work while the app loads.
              // Keep CSS, the local font and the hero ahead of hydration scripts.
              return html.replace(/<(?:script\b(?=[^>]*\btype="module")|link\b(?=[^>]*\brel="modulepreload"))[^>]*>/g,
                tag => tag.replace(/\sfetchpriority="[^"]*"/g, '').replace(/>$/, ' fetchpriority="low">'));
            },
          },
        },
        process.env.ANALYZE_BUNDLE === 'true' && visualizer({
          filename: './dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
      ],
      build: {
        outDir: 'dist', manifest: true, emptyOutDir: true, target: 'esnext', cssCodeSplit: true,
        rollupOptions: { output: {
          // Do not pull lazy PDF, Firebase, legal or admin dependencies into a shared public chunk.
          onlyExplicitManualChunks: true,
          manualChunks(id) {
            if (/node_modules\/(react|react-dom|scheduler)(?:\/|$)/.test(id)) return 'vendor-react';
          },
        } },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
