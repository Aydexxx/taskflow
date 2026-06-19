import { z } from 'zod';
import { hasAtLeastOneField } from './util';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  })
  .refine(hasAtLeastOneField, { message: 'At least one field must be provided' });

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  // OWNER is assigned automatically at workspace creation and cannot be granted here.
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
