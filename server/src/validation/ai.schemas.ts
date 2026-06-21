import { z } from 'zod';

export const draftDescriptionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
});

export type DraftDescriptionInput = z.infer<typeof draftDescriptionSchema>;
