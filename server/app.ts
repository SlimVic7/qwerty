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
import { careerRouter } from './routes/career.js';
import { careerCoachRouter } from './routes/careerCoach.js';
import { processPendingCvParses } from './services/cv/cvParsingService.js';

export function createExpressApp(): express.Express {
  const app = express();

  // On app startup, trigger background recovery sweeper for durable pending CV parses
  processPendingCvParses().catch((err) => {
    console.warn('[CV_PARSER_RECOVERY_INIT] Recovery check completed:', err);
  });

  // CORS & Preflight handling for browser and iframe API requests
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // JSON Body Parser with 3mb limit
  app.use(express.json({ limit: '3mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'QWERTY API is running' });
  });

  // API Routers
  app.use('/api/candidate/career/coach', careerCoachRouter);
  app.use('/api/candidate/notifications', careerCoachRouter);
  app.use('/api/candidate/career', careerRouter);
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
