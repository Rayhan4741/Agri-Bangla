import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { Router, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { aiConfigured, config } from './config.js';
import { optionalAuth, requireAdmin } from './lib/auth.js';
import { HttpError } from './lib/httpError.js';
import { adminRouter } from './routes/admin.js';
import { aiRouter } from './routes/ai.js';
import { authRouter } from './routes/auth.js';
import { contentRouter } from './routes/content.js';
import { diaryRouter } from './routes/diary.js';
import { mountMarket } from './routes/market.js';
import { weatherRouter } from './routes/weather.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render/Railway/nginx: real client IP for rate limits
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          // https: lets the client fall back to Open-Meteo directly and use the optional bring-your-own-key AI mode
          'connect-src': ["'self'", 'https:'],
          'font-src': ["'self'", 'data:'],
          'worker-src': ["'self'", 'blob:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression({ filter: (req, res) => (res.getHeader('Content-Type')?.toString().includes('text/event-stream') ? false : compression.filter(req, res)) }));
  app.use(express.json({ limit: '600kb' }));
  app.use(cookieParser());

  // CORS for a separately hosted client (dev server or another domain). Same-origin needs none.
  const allowed = config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    // CSRF guard: state-changing requests from a browser must come from an allowed origin or our own host
    if (!['GET', 'HEAD'].includes(req.method) && origin) {
      const self = `${req.protocol}://${req.get('host')}`;
      if (origin !== self && !allowed.includes(origin)) return next(new HttpError(403, 'BAD_ORIGIN', 'অনুমোদিত নয় এমন উৎস থেকে অনুরোধ।'));
    }
    next();
  });

  const api = Router();
  api.use(optionalAuth);
  api.get('/health', (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date().toISOString() });
  });
  api.get('/config', (_req, res) => {
    res.json({
      ai: { enabled: aiConfigured(), provider: config.GEMINI_API_KEY ? 'Google Gemini' : config.FALLBACK_AI_MODEL ? 'OpenAI-compatible' : null, model: config.GEMINI_API_KEY ? config.GEMINI_MODEL : config.FALLBACK_AI_MODEL || null, vision: Boolean(config.GEMINI_API_KEY) },
      market: { source: 'TCB', autofetch: config.TCB_AUTOFETCH },
      weather: { provider: 'Open-Meteo' },
    });
  });
  api.use('/auth', authRouter);
  api.use('/content', contentRouter);
  api.use('/ai', aiRouter);
  api.use('/weather', weatherRouter);
  api.use('/diary', diaryRouter);
  mountMarket(api);
  api.use('/admin', requireAdmin, adminRouter);
  api.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'এই API পথটি নেই।')));
  app.use('/api', api);

  // Serve the built React client from the same origin in production.
  const clientDist = config.CLIENT_DIST || path.resolve(here, '../../client/dist');
  if (existsSync(path.join(clientDist, 'index.html'))) {
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders: (res, file) => {
          if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    const e = err as { type?: string; code?: string | number; status?: number; message?: string };
    if (e?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'অনুরোধটি খুব বড়।' } });
    if (e?.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'JSON সঠিক নয়।' } });
    if (e?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'ফাইলটি অনেক বড়।' } });
    if (e?.code === 11000) return res.status(409).json({ error: { code: 'DUPLICATE', message: 'একই রেকর্ড আগে থেকেই আছে।' } });
    const name = (err as Error)?.name ?? '';
    if (/Mongo(Server|Network|NotConnected)?Error|MongooseServerSelectionError/.test(name) || /buffering timed out|Client must be connected|bufferCommands = false/i.test((err as Error)?.message ?? '')) {
      return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'ডাটাবেসে সংযোগ নেই। কিছুক্ষণ পরে আবার চেষ্টা করুন।' } });
    }
    console.error(err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'সার্ভারে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।' } });
  });
  return app;
}
