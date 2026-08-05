import 'express-async-errors'; // patches Express 4 to forward async route errors to errorHandler
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  // Behind a single reverse proxy in production (Render). Required so rate
  // limiting and req.ip use the real client IP from X-Forwarded-For.
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1', routes);

  app.use(errorHandler);

  return app;
}
