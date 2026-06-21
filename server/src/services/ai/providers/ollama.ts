import type { GenerateOptions, LlmClient } from '../types';
import { LlmTransportError, postJson } from '../http';

export interface OllamaConfig {
  url: string;
  chatModel: string;
  embedModel: string;
  timeoutMs: number;
}

interface OllamaChatResponse {
  message?: { content?: string };
}

interface OllamaEmbedResponse {
  embedding?: number[];
}

/**
 * Local Ollama client (no credentials, just a reachable URL). Used for fully
 * offline/self-hosted AI; selected purely by config, never referenced from
 * feature code.
 */
export class OllamaClient implements LlmClient {
  readonly provider = 'ollama' as const;

  constructor(private readonly config: OllamaConfig) {}

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const messages = [
      ...(options.system ? [{ role: 'system' as const, content: options.system }] : []),
      { role: 'user' as const, content: prompt },
    ];
    const body = await postJson<OllamaChatResponse>(
      `${this.config.url}/api/chat`,
      { model: this.config.chatModel, messages, stream: false, options: { temperature: options.temperature ?? 0.4 } },
      {},
      this.config.timeoutMs,
    );
    const content = body.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new LlmTransportError('Ollama returned an empty completion');
    }
    return content;
  }

  async embed(text: string): Promise<number[]> {
    const body = await postJson<OllamaEmbedResponse>(
      `${this.config.url}/api/embeddings`,
      { model: this.config.embedModel, prompt: text },
      {},
      this.config.timeoutMs,
    );
    if (!Array.isArray(body.embedding)) throw new LlmTransportError('Ollama returned no embedding');
    return body.embedding;
  }
}
