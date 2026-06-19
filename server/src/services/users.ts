import type { User as PrismaUser } from '@prisma/client';
import type { User } from '@taskflow/shared';

/** Maps a Prisma User row to the shared, wire-safe `User` view (never includes passwordHash). */
export function toSafeUser(user: PrismaUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
