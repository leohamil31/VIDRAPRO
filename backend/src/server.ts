import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './env';
import { errorHandler } from './lib/http';
import { requireAuth } from './middleware/auth';
import { subscriptionGate } from './middleware/subscription';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { quotesRouter } from './routes/quotes';
import { settingsRouter } from './routes/settings';
import { webhooksRouter } from './routes/webhooks';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
  exposedHeaders: ['X-Subscription-Status'],
}));

// Webhooks need the raw body for HMAC → mount BEFORE express.json()
app.use('/webhooks', webhooksRouter);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', rateLimit({ windowMs: 15 * 60_000, limit: 30 }), authRouter);
app.use('/public', publicRouter);

// Everything below is tenant-scoped
app.use('/settings', requireAuth, subscriptionGate, settingsRouter);
app.use('/quotes', requireAuth, subscriptionGate, quotesRouter);

app.use(errorHandler);

app.listen(env.PORT, () => console.log(`VidraPro API on :${env.PORT} (auth: ${env.AUTH_MODE})`));
