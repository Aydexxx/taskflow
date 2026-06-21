import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env';
import apiRoutes from './routes';
import { UPLOADS_ROOT } from './services/uploads';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/** Build and configure the Express application (no network binding here). */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  // Avatar uploads arrive as base64 image data URLs in a JSON body. A 2 MB image
  // inflates to ~2.7 MB once base64-encoded, so the JSON limit is raised to give
  // headroom; the avatar handler still enforces the real 2 MB limit on the
  // decoded bytes.
  app.use(express.json({ limit: '4mb' }));

  // User-uploaded files (e.g. avatars), served read-only. Long-cached since
  // every upload gets a unique, timestamped filename.
  app.use('/uploads', express.static(UPLOADS_ROOT, { immutable: true, maxAge: '7d', index: false }));

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
