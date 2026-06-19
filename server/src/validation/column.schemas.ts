import { z } from 'zod';
import { hasAtLeastOneField } from './util';

export const createColumnSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long'),
  // 0-based target index among the board's columns; defaults to the end of the list.
  index: z.number().int().nonnegative().optional(),
});

export const updateColumnSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long').optional(),
    index: z.number().int().nonnegative().optional(),
  })
  .refine(hasAtLeastOneField, { message: 'At least one field must be provided' });

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
