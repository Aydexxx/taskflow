import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../errors/HttpError';

/** Max accepted avatar size, measured on the decoded image bytes. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

/** Accepted image MIME types, mapped to the file extension we store. */
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Absolute path to the uploads root (served statically at `/uploads`). */
export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.join(UPLOADS_ROOT, 'avatars');

/** Public URL path prefix avatars are served under. */
const AVATAR_URL_PREFIX = '/uploads/avatars/';

const DATA_URL_RE = /^data:([a-z]+\/[a-z+.-]+);base64,(.+)$/i;

interface ParsedImage {
  ext: string;
  buffer: Buffer;
}

/**
 * Validate a base64 image data URL and return its bytes. Throws a 400
 * ValidationError on an unsupported type or an oversized image (checked against
 * the *decoded* size, not the inflated base64 length).
 */
function parseImageDataUrl(dataUrl: string): ParsedImage {
  const match = DATA_URL_RE.exec(dataUrl.trim());
  if (!match) {
    throw new ValidationError('Avatar must be a base64 image data URL');
  }
  const mime = match[1].toLowerCase();
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    throw new ValidationError('Avatar must be a JPG, PNG, or WebP image');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) {
    throw new ValidationError('Avatar image is empty or invalid');
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new ValidationError('Avatar must be 2 MB or smaller');
  }
  return { ext, buffer };
}

/**
 * Persist a user's avatar from a data URL and return the public URL path to
 * store on `user.avatarUrl`. Files live under `uploads/avatars/` (gitignored).
 */
export async function storeAvatar(userId: string, dataUrl: string): Promise<string> {
  const { ext, buffer } = parseImageDataUrl(dataUrl);
  await mkdir(AVATAR_DIR, { recursive: true });
  const fileName = `${userId}-${Date.now()}.${ext}`;
  await writeFile(path.join(AVATAR_DIR, fileName), buffer);
  return `${AVATAR_URL_PREFIX}${fileName}`;
}

/**
 * Best-effort removal of a previously stored local avatar (ignored if it isn't
 * one of ours, e.g. an external URL, or if the file is already gone).
 */
export async function removeStoredAvatar(avatarUrl: string | null): Promise<void> {
  if (!avatarUrl || !avatarUrl.startsWith(AVATAR_URL_PREFIX)) return;
  const fileName = path.basename(avatarUrl);
  await unlink(path.join(AVATAR_DIR, fileName)).catch(() => {
    /* already removed or never existed — nothing to do */
  });
}
