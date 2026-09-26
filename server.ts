/**
 * QWERTY Server Listener & Static / Vite Host
 * Imports the single Express composition root from server/app.ts
 * and attaches Vite middleware (dev) or static serving (prod), then starts listener.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { app } from './server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = process.cwd() || path.resolve(__dirname);

export async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode: use Vite's development server
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // SPA fallback in development mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return res.status(404).json({
          error: 'API_ENDPOINT_NOT_FOUND',
          message: `Cannot ${req.method} ${url}`
        });
      }
      try {
        const indexPath = path.resolve(root, 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production mode: serve static files from dist
    app.use(express.static(path.resolve(root, 'dist')));
    app.use('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
          error: 'API_ENDPOINT_NOT_FOUND',
          message: `Cannot ${req.method} ${req.originalUrl}`
        });
      }
      res.sendFile(path.resolve(root, 'dist', 'index.html'));
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
    console.log(`Server is running at http://${host}:${port}`);
  });

  return { app, server };
}

startServer().catch(console.error);
