import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Deep links such as /a/#WAIX1.… or /legal/privacy are served by the host's
 * 404 fallback. Because the bundle uses relative asset URLs (so the site also
 * works from a file system), the fallback HTML needs a <base href> pointing at
 * the site root — otherwise the browser would look for /a/assets/… .
 *
 * In production .github/workflows/pages.yml injects that tag into 404.html.
 * This plugin does the same for `vite preview` so the share link can be tested
 * locally without a copy of the Pages setup.
 */
function deepLinkPreview(): Plugin {
  const injectBase = (html: string, base: string) =>
    html.includes('<base ') ? html : html.replace('<head>', `<head>\n    <base href="${base}" />`);
  return {
    name: 'wai-deep-link-preview',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/';
        const [pathname] = url.split('?');
        const wantsHtml = (req.headers.accept ?? '').includes('text/html');
        const isDeepPath = pathname !== '/' && !path.extname(pathname);
        if (!wantsHtml || !isDeepPath) return next();
        const html = injectBase(readFileSync(path.join(import.meta.dirname, 'dist/index.html'), 'utf8'), '/');
        res.setHeader('content-type', 'text/html');
        res.end(html);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), deepLinkPreview()],
  base: './',
  resolve: {
    alias: {
      '@wai/shared': path.resolve(import.meta.dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: false,
  },
});
