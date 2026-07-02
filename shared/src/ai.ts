import type { CardPriority, LabelColor } from './models';

/**
 * AI assist contract shared by server and client.
 *
 * The AI layer is provider-agnostic and degrades gracefully: with no provider
 * configured it is fully inert (every endpoint inactive, no UI). The client
 * discovers whether it is on via `HealthResponse.ai` and only then renders the
 * AI affordances. All structured features return suggestions/drafts the user
 * edits and confirms — the server never mutates data on the user's behalf here.
 */

/** Which LLM backend the server is wired to. `none` means AI is disabled. */
export type AIProvider = 'none' | 'openai' | 'ollama';

/** AI availability advertised on `GET /api/health` so the client can gate its UI. */
export interface AIStatus {
  /** True only when a provider and its credentials are configured server-side. */
  enabled: boolean;
  /** The active provider, for diagnostics. `none` whenever `enabled` is false. */
  provider: AIProvider;
}

/** Response for `POST /api/ai/boards/:boardId/summary`. */
export interface SummarizeBoardResponse {
  /** A concise, manager-friendly status digest in plain text (may include line breaks). */
  summary: string;
}

/** Request body for `POST /api/ai/boards/:boardId/ask`. */
export interface AskBoardRequest {
  /** The user's free-form natural-language question about the board. */
  question: string;
}

/** Response for `POST /api/ai/boards/:boardId/ask`. */
export interface AskBoardResponse {
  /** A concise, plain-text answer grounded in the board's current state (may include line breaks). */
  answer: string;
}

/** Request body for `POST /api/ai/workspaces/:workspaceId/ask`. */
export interface AskWorkspaceRequest {
  /** The user's free-form natural-language question about the workspace. */
  question: string;
}

/** Response for `POST /api/ai/workspaces/:workspaceId/ask`. */
export interface AskWorkspaceResponse {
  /** A concise, plain-text answer grounded in the workspace's members, boards, and activity. */
  answer: string;
}

/** One turn of a conversation with the global assistant. `system` turns are server-side only. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Request body for `POST /api/ai/assistant/ask` (global, conversational). */
export interface AskAssistantRequest {
  /** The user's new free-form question. */
  question: string;
  /** Prior conversation turns for multi-turn memory (oldest first). Optional. */
  history?: ChatMessage[];
}

/** Response for `POST /api/ai/assistant/ask`. */
export interface AskAssistantResponse {
  /** A concise, conversational answer grounded in everything the user can access. */
  answer: string;
}

/** Response for `POST /api/ai/cards/:cardId/subtasks`. */
export interface SuggestSubtasksResponse {
  /** Suggested checklist items; the user accepts/edits these before anything is saved. */
  subtasks: string[];
}

/** Request body for `POST /api/ai/workspaces/:workspaceId/draft-description`. */
export interface DraftDescriptionRequest {
  /** The short card title the draft is generated from. */
  title: string;
}

/** Response for `POST /api/ai/workspaces/:workspaceId/draft-description`. */
export interface DraftDescriptionResponse {
  /** A description draft the user edits before saving. */
  description: string;
}

/** Response for `POST /api/ai/cards/:cardId/suggestions`. */
export interface SuggestMetadataResponse {
  /** Suggested label names (free-form; the client maps these onto workspace labels). */
  labels: string[];
  /** A suggested priority, or null when the model declines to suggest one. */
  priority: CardPriority | null;
  /** Optional one-line rationale shown alongside the suggestions. */
  reason?: string;
}

/** Curated label colors the model may pick from when proposing brand-new labels. */
export type SuggestedLabelColor = LabelColor;
