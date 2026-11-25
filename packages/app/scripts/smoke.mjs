/**
 * Runs the render smoke test through Vite's SSR pipeline so CSS imports,
 * path aliases and TSX behave exactly like in the real build.
 *
 *   npm run smoke:render -w @wai/landing
 */
import { createServer } from 'vite';

const server = await createServer({
  configFile: new URL('../vite.config.ts', import.meta.url).pathname,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
});

try {
  await server.ssrLoadModule('/src/test/renderSmoke.tsx');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await server.close();
}
