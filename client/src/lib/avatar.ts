import { config } from '../config';

/**
 * Resolve a stored `avatarUrl` to a URL the browser can load.
 *
 * Uploaded avatars are stored as a server-relative path (`/uploads/avatars/…`),
 * which must be prefixed with the API origin. Absolute URLs (http/https) and
 * inline data URLs are returned unchanged. Returns `null` when there's no
 * avatar, so callers fall back to the initials avatar.
 */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (/^(https?:|data:)/i.test(avatarUrl)) return avatarUrl;
  return `${config.apiUrl}${avatarUrl}`;
}
