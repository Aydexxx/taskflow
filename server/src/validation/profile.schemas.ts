import { z } from 'zod';

/**
 * A single social link: a valid http(s) URL, or an empty string which we treat
 * as "not set". Normalized to `undefined` so blank fields are dropped from the
 * stored JSON rather than persisted as empty strings.
 */
const socialUrl = z
  .string()
  .trim()
  .max(200, 'Link is too long')
  .url('Must be a valid URL')
  .refine((value) => /^https?:\/\//i.test(value), 'Must start with http:// or https://')
  .or(z.literal(''))
  .transform((value) => (value === '' ? undefined : value))
  .optional();

export const socialLinksSchema = z.object({
  website: socialUrl,
  github: socialUrl,
  linkedin: socialUrl,
  twitter: socialUrl,
});

/** Body for `PATCH /api/users/me`. All fields optional; `null` clears title/bio. */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
    title: z.string().trim().max(100, 'Title is too long').nullable().optional(),
    bio: z.string().trim().max(500, 'Bio is too long').nullable().optional(),
    socialLinks: socialLinksSchema.optional(),
  })
  .strict();

/** Body for `POST /api/users/me/avatar` — a base64 image data URL. */
export const uploadAvatarSchema = z.object({
  data: z.string().min(1, 'Image data is required'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>;
