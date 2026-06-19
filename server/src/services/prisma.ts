import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client.
 *
 * In development, module reloads (tsx watch) could otherwise create a new
 * client on every reload and exhaust connections, so we cache it on globalThis.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
