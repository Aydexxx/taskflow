import { z } from 'zod';

export const draftDescriptionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
});

export type DraftDescriptionInput = z.infer<typeof draftDescriptionSchema>;

export const askBoardSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(500, 'Question is too long'),
});

export type AskBoardInput = z.infer<typeof askBoardSchema>;

export const askWorkspaceSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(500, 'Question is too long'),
});

export type AskWorkspaceInput = z.infer<typeof askWorkspaceSchema>;

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1, 'Message content is required').max(4000, 'Message is too long'),
});

export const askAssistantSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(500, 'Question is too long'),
  history: z.array(chatMessageSchema).max(16, 'Too many prior messages').optional(),
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;
