import type { User as PrismaUser } from '@prisma/client';
import type { SocialLinks, User } from '@taskflow/shared';

/** Keys we accept on the stored social-links JSON. */
const SOCIAL_KEYS = ['website', 'github', 'linkedin', 'twitter'] as const;

/**
 * Parse the JSON-encoded `socialLinks` column into a clean `SocialLinks` object.
 * Tolerant by design: unknown keys, non-string values, and malformed JSON all
 * degrade to an empty/partial object rather than throwing on read.
 */
export function parseSocialLinks(raw: string | null): SocialLinks {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const result: SocialLinks = {};
    for (const key of SOCIAL_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** Maps a Prisma User row to the shared, wire-safe `User` view (never includes passwordHash). */
export function toSafeUser(user: PrismaUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    title: user.title,
    bio: user.bio,
    socialLinks: parseSocialLinks(user.socialLinks),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
