import type { AIProvider } from '@taskflow/shared';

/** Options every LLM call accepts; kept tiny and provider-neutral on purpose. */
export interface GenerateOptions {
  /** Optional system prompt steering tone/format (e.g. "respond with strict JSON"). */
  system?: string;
  /** Sampling temperature; features that need deterministic JSON pass a low value. */
  temperature?: number;
}

/**
 * A single chat message. `system` steers the whole exchange; `user`/`assistant`
 * carry the multi-turn conversation. Maps directly onto OpenAI-style
 * `/chat/completions` messages.
 */
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * The single seam every provider implements. Features depend only on this
 * interface, so switching providers (or faking one in tests) never touches
 * feature code — there are no provider conditionals scattered through the app.
 */
export interface LlmClient {
  readonly provider: AIProvider;
  /** Produce a completion for `prompt`. Implementations time out and throw on transport/HTTP errors. */
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  /** Produce a completion for a multi-turn `messages` array (system + conversation). */
  chat(messages: LlmMessage[], options?: GenerateOptions): Promise<string>;
  /** Optional embedding support; absent on providers/configs that don't offer it. */
  embed?(text: string): Promise<number[]>;
}
