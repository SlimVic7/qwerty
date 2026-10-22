/**
 * QWERTY Server Listener & Static / Vite Host
 * Imports the single Express composition root from server/app.ts
 * and attaches Vite middleware (dev with HMR) or static serving (prod / HMR-free preview),
 * then starts listener.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import type { Server } from 'http';
import type { ViteDevServer } from 'vite';
import { createServer as createViteServer } from 'vite';
import { app } from './server/app.js';
import { isHmrDisabled, getEffectiveViteServerConfig } from './server/config/runtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = process.cwd() || path.resolve(__dirname);

let activeServer: Server | null = null;
let activeVite: ViteDevServer | null = null;

export async function stopServer(): Promise<void> {
  if (activeVite) {
    await activeVite.close();
    activeVite = null;
  }
  if (activeServer) {
    await new Promise<void>((resolve) => {
      activeServer!.close(() => resolve());
    });
    activeServer = null;
  }
}

export async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const disableHmr = isHmrDisabled();

  if (isProd || disableHmr) {
    // Production or HMR-Free Preview Mode (AI Studio / sandbox container):
    // Serve client assets without Vite HMR runtime. This eliminates WebSocket
    // connection attempts, reconnection loops, and createWebSocketModuleRunnerTransport errors.
    const distDir = path.resolve(root, 'dist');
    const distIndexPath = path.resolve(distDir, 'index.html');

    // Auto-build static client assets if missing (e.g. fresh checkout)
    if (!fs.existsSync(distIndexPath)) {
      console.log('[server] Static client build not found. Building for HMR-free preview...');
      const { build: viteBuild } = await import('vite');
      await viteBuild({ root });
    }

    // Serve hashed assets under /assets with immutable caching
    app.use('/assets', express.static(path.resolve(distDir, 'assets'), {
      immutable: true,
      maxAge: '1y',
    }));

    // Serve other static files from dist (favicon, robots, etc.)
    app.use(express.static(distDir));

    // SPA fallback: all non-API GET requests serve dist/index.html
    // Guarantees missing /assets/* requests return 404 and never swallow HTML
    app.use('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
          error: 'API_ENDPOINT_NOT_FOUND',
          message: `Cannot ${req.method} ${req.originalUrl}`,
        });
      }
      if (req.originalUrl.startsWith('/assets/')) {
        return res.status(404).type('text/plain').send('Asset not found');
      }
      res.sendFile(distIndexPath);
    });
  } else {
    // Normal Local Development Mode: full Vite dev server with HMR / Fast Refresh
    const viteConfig = getEffectiveViteServerConfig({ root, disableHmr: false });
    activeVite = await createViteServer(viteConfig);
    app.use(activeVite.middlewares);

    // SPA fallback in development mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return res.status(404).json({
          error: 'API_ENDPOINT_NOT_FOUND',
          message: `Cannot ${req.method} ${url}`,
        });
      }
      try {
        const indexPath = path.resolve(root, 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await activeVite!.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e) {
        activeVite?.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  // Parse command-line args for --port and --host
  const args = process.argv.slice(2);
  let port = Number(process.env.PORT) || 3000;
  let host = '0.0.0.0';

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      port = Number(args[i + 1]);
    }
    if ((args[i] === '--host' || args[i] === '-h') && args[i + 1]) {
      host = args[i + 1];
    }
  }

  const server = app.listen(port, host, () => {
    console.log(`Server is running at http://${host}:${port} (HMR: ${disableHmr ? 'DISABLED (clean preview mode)' : 'ENABLED'})`);
  });
  activeServer = server;

  // Graceful shutdown listeners
  const cleanup = async () => {
    await stopServer();
    process.exit(0);
  };
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);

  return { app, server, vite: activeVite };
}

// Only auto-start when executed directly (not when imported in unit tests)
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer().catch(console.error);
}
