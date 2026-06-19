import { z } from 'zod';

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Name is too long'),
  color: z.enum(['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink']),
});

export const attachLabelSchema = z.object({
  labelId: z.string().trim().min(1, 'labelId is required'),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type AttachLabelInput = z.infer<typeof attachLabelSchema>;
