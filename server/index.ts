import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { authMiddleware } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { casesRouter } from './routes/cases.js';
import { generateRouter } from './routes/generate.js';
import { importPdfRouter } from './routes/importPdf.js';
import { assignmentsRouter } from './routes/assignments.js';
import { submissionsRouter } from './routes/submissions.js';
import { assessRouter } from './routes/assess.js';
import { reviewsRouter } from './routes/reviews.js';
import { dashboardRouter } from './routes/dashboard.js';
import { workspaceRouter } from './routes/workspace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB and load seeds
initDatabase();
seedDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload in request body' });
  }
  next(err);
});
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(authMiddleware);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/generate', generateRouter);
app.use('/api/import', importPdfRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/assess', assessRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/workspace', workspaceRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Arzon PV Case Intelligence',
    version: '1.0.0',
    currentUser: req.user
  });
});

// Download Brochure Endpoint
app.get('/api/brochure/download', (req, res) => {
  const brochurePath = path.resolve(__dirname, '../public/brochure.html');
  res.download(brochurePath, 'Arzon_PV_Case_Intelligence_Operations_Guide.html', (err) => {
    if (err) {
      console.error('Failed to download brochure:', err);
      res.status(500).json({ error: 'Failed to download brochure file.' });
    }
  });
});

// Serve public static assets (e.g. brochure) and frontend production build
const publicPath = path.resolve(__dirname, '../public');
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(publicPath));
app.use(express.static(distPath));

// For SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Arzon PV Case Intelligence API is running. Start the Vite dev server for frontend.');
    }
  });
});

// Global unhandled error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Unhandled Express Error]:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

app.listen(PORT, () => {
  console.log(`[Arzon PV Server] Listening on http://localhost:${PORT}`);
});

export default app;
