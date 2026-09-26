/**
 * QWERTY Server Application Root — Single Express Composition Root
 * 
 * Configures middleware, API routes, API 404 handler, and centralized error handling.
 * Does NOT start listeners or configure Vite/static serving.
 */

import express from 'express';
import { jobsRouter } from './routes/jobs.js';
import { jobImportsRouter } from './routes/jobImports.js';
import { candidateRouter } from './routes/candidate.js';
import { cvParsingRouter } from './routes/cvParsing.js';
import { talentPoolRouter } from './routes/talentPool.js';

export function createExpressApp(): express.Express {
  const app = express();

  // JSON Body Parser with 3mb limit
  app.use(express.json({ limit: '3mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'QWERTY API is running' });
  });

  // API Routers
  app.use('/api/candidate', candidateRouter);
  app.use('/api/candidate/cvs', cvParsingRouter);
  app.use('/api/ops/jobs', jobsRouter);
  app.use('/api/ops/imports', jobImportsRouter);
  app.use('/api/ops/talent', talentPoolRouter);

  // Strict API 404 handler: Guarantees /api/* requests never fall through to SPA HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: 'API_ENDPOINT_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  });

  // Centralized API error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error('[API_ERROR]', err);
    res.status(err.status || 500).json({
      error: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.'
    });
  });

  return app;
}

export const app = createExpressApp();
