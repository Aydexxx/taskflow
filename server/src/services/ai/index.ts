import type { AiEnv } from '../../config/env';
import { env } from '../../config/env';
import type { LlmClient } from './types';
import { AiService } from './service';
import { OpenAiClient } from './providers/openai';
import { OllamaClient } from './providers/ollama';
import { aiLogger } from './logger';

/**
 * Build the LLM client implied by config, or `null` to disable AI.
 *
 * This is the *only* place provider selection happens. A provider is enabled
 * solely by configuration AND its credentials being present — e.g. selecting
 * `openai` without an API key leaves AI disabled rather than crashing. Switching
 * providers is a pure config change; no feature code branches on the provider.
 */
function buildClient(config: AiEnv): LlmClient | null {
  switch (config.provider) {
    case 'openai': {
      if (!config.openai.apiKey) {
        aiLogger.warn('disabled.missing_credentials', { provider: 'openai' });
        return null;
      }
      return new OpenAiClient({
        apiKey: config.openai.apiKey,
        chatModel: config.openai.chatModel,
        embedModel: config.openai.embedModel,
        baseUrl: config.openai.baseUrl,
        timeoutMs: config.requestTimeoutMs,
      });
    }
    case 'ollama': {
      if (!config.ollama.url) {
        aiLogger.warn('disabled.missing_url', { provider: 'ollama' });
        return null;
      }
      return new OllamaClient({
        url: config.ollama.url,
        chatModel: config.ollama.chatModel,
        embedModel: config.ollama.embedModel,
        timeoutMs: config.requestTimeoutMs,
      });
    }
    default:
      return null;
  }
}

/** Construct an `AiService` from the given AI config (defaults to the process env). */
export function createAiServiceFromEnv(config: AiEnv = env.ai): AiService {
  const service = new AiService(buildClient(config));
  aiLogger.info('initialized', { enabled: service.isEnabled(), provider: service.provider });
  return service;
}

// Module-level singleton. Held behind getter/setter so tests can swap in a
// faked provider without any real network calls (and restore afterward).
let instance: AiService = createAiServiceFromEnv();

/** The active AI service. Every controller/feature reads through this. */
export function getAiService(): AiService {
  return instance;
}

/** Replace the active AI service. Intended for tests (faked providers). */
export function setAiService(service: AiService): void {
  instance = service;
}

export { AiService } from './service';
export type { LlmClient, GenerateOptions } from './types';
