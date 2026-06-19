import { z } from 'zod';
import { hasAtLeastOneField } from './util';

export const createBoardSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150, 'Title is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
});

export const updateBoardSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(150, 'Title is too long').optional(),
    description: z.string().trim().max(2000, 'Description is too long').nullable().optional(),
  })
  .refine(hasAtLeastOneField, { message: 'At least one field must be provided' });

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
