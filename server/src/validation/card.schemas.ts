import { z } from 'zod';
import { hasAtLeastOneField } from './util';

const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createCardSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().trim().max(5000, 'Description is too long').optional(),
  assigneeId: z.string().trim().min(1, 'Invalid assignee').optional(),
  priority: prioritySchema.optional(),
  dueDate: z.string().datetime({ message: 'Invalid due date' }).optional(),
  // 0-based target index among the column's cards; defaults to the end of the list.
  index: z.number().int().nonnegative().optional(),
});

export const updateCardSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long').optional(),
    description: z.string().trim().max(5000, 'Description is too long').nullable().optional(),
    assigneeId: z.string().trim().min(1, 'Invalid assignee').nullable().optional(),
    priority: prioritySchema.optional(),
    dueDate: z.string().datetime({ message: 'Invalid due date' }).nullable().optional(),
  })
  .refine(hasAtLeastOneField, { message: 'At least one field must be provided' });

export const moveCardSchema = z.object({
  columnId: z.string().trim().min(1, 'columnId is required'),
  index: z.number().int().nonnegative(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
