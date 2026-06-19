import { createServer } from 'node:http';
import { createApp } from './app';
import { createSocketServer } from './socket';
import { env } from './config/env';
import { prisma } from './services/prisma';

/** Bootstrap: build the Express app, attach Socket.IO, and start listening. */
async function main(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  // Attach the typed Socket.IO server to the same HTTP server.
  createSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`[server] CORS / Socket.IO origin: ${env.clientUrl}`);
  });

  // Graceful shutdown: close sockets, HTTP server, and the DB connection.
  const shutdown = (signal: string): void => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] received ${signal}, shutting down...`);
    httpServer.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[server] fatal startup error:', error);
  process.exit(1);
});
