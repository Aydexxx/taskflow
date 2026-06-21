import type { Request, Response } from 'express';
import type { ApiError, User } from '@taskflow/shared';
import { prisma } from '../services/prisma';
import { toSafeUser } from '../services/users';
import { storeAvatar, removeStoredAvatar } from '../services/uploads';
import { currentUserId } from '../middleware/auth';
import type { UpdateProfileInput, UploadAvatarInput } from '../validation/profile.schemas';

/** PATCH /api/users/me -> update the current user's profile fields. */
export async function updateProfile(
  req: Request<unknown, unknown, UpdateProfileInput>,
  res: Response<User | ApiError>,
): Promise<void> {
  const userId = currentUserId(req);
  const { name, title, bio, socialLinks } = req.body;

  // Build a partial update so omitted fields are left untouched; `null` clears.
  const data: { name?: string; title?: string | null; bio?: string | null; socialLinks?: string } = {};
  if (name !== undefined) data.name = name;
  if (title !== undefined) data.title = title;
  if (bio !== undefined) data.bio = bio;
  if (socialLinks !== undefined) data.socialLinks = JSON.stringify(socialLinks);

  const user = await prisma.user.update({ where: { id: userId }, data });
  res.json(toSafeUser(user));
}

/** POST /api/users/me/avatar -> validate + store an uploaded image, set avatarUrl. */
export async function uploadAvatar(
  req: Request<unknown, unknown, UploadAvatarInput>,
  res: Response<User | ApiError>,
): Promise<void> {
  const userId = currentUserId(req);

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  // storeAvatar validates type/size and throws a 400 on failure.
  const avatarUrl = await storeAvatar(userId, req.body.data);

  const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  // Clean up the previous file (best-effort) once the new one is committed.
  await removeStoredAvatar(existing?.avatarUrl ?? null);

  res.json(toSafeUser(user));
}
