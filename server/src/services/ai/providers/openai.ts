import type { GenerateOptions, LlmClient, LlmMessage } from '../types';
import { LlmTransportError, postJson } from '../http';

export interface OpenAiConfig {
  apiKey: string;
  chatModel: string;
  embedModel: string;
  baseUrl: string;
  timeoutMs: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

/**
 * OpenAI-compatible chat/embeddings client (also works against any
 * OpenAI-compatible gateway via `baseUrl`). Constructed only when an API key
 * is present, so its mere existence implies AI is enabled.
 */
export class OpenAiClient implements LlmClient {
  readonly provider = 'openai' as const;

  constructor(private readonly config: OpenAiConfig) {}

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const messages: LlmMessage[] = [
      ...(options.system ? [{ role: 'system' as const, content: options.system }] : []),
      { role: 'user' as const, content: prompt },
    ];
    return this.chat(messages, options);
  }

  async chat(messages: LlmMessage[], options: GenerateOptions = {}): Promise<string> {
    const body = await postJson<ChatCompletionResponse>(
      `${this.config.baseUrl}/chat/completions`,
      { model: this.config.chatModel, messages, temperature: options.temperature ?? 0.4 },
      { Authorization: `Bearer ${this.config.apiKey}` },
      this.config.timeoutMs,
    );
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new LlmTransportError('OpenAI returned an empty completion');
    }
    return content;
  }

  async embed(text: string): Promise<number[]> {
    const body = await postJson<EmbeddingResponse>(
      `${this.config.baseUrl}/embeddings`,
      { model: this.config.embedModel, input: text },
      { Authorization: `Bearer ${this.config.apiKey}` },
      this.config.timeoutMs,
    );
    const embedding = body.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) throw new LlmTransportError('OpenAI returned no embedding');
    return embedding;
  }
}
