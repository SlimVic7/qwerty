import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { jobsRouter } from './routes/jobs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function createServer() {
  const app = express();
  app.use(express.json());

  // API Routes will go here
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'QWERTY API is running' });
  });

  app.use('/api/ops/jobs', jobsRouter);

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode: use Vite's development server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve static files from dist
    app.use(express.static(path.resolve(root, 'dist')));
    app.use('*', (req, res) => {
      res.sendFile(path.resolve(root, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

createServer().catch(console.error);
