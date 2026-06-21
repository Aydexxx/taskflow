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

// OWNER is assigned automatically at workspace creation/transfer and cannot be granted here.
const grantableRoleSchema = z.enum(['ADMIN', 'MEMBER', 'VIEWER']);

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: grantableRoleSchema.optional(),
});

export const updateMemberRoleSchema = z.object({
  role: grantableRoleSchema,
});

export const transferOwnershipSchema = z.object({
  memberId: z.string().trim().min(1, 'memberId is required'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
