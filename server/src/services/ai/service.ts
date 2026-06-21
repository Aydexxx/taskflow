import type { AIProvider, AIStatus } from '@taskflow/shared';
import type { GenerateOptions, LlmClient } from './types';
import { aiLogger } from './logger';

/**
 * The provider-agnostic AI facade the rest of the server talks to.
 *
 * Wraps an `LlmClient` (or `null` when disabled). Every feature goes through
 * `isEnabled()` first; `generate()` additionally guards so a disabled service
 * can never reach a provider. When disabled the service is completely inert and
 * never throws on construction — the app boots identically with or without AI.
 */
export class AiService {
  constructor(private readonly client: LlmClient | null) {}

  /** True only when a provider with valid credentials is wired up. */
  isEnabled(): boolean {
    return this.client !== null;
  }

  /** The active provider for diagnostics; `none` whenever disabled. */
  get provider(): AIProvider {
    return this.client?.provider ?? 'none';
  }

  /** AI availability advertised on `/api/health`. */
  status(): AIStatus {
    return { enabled: this.isEnabled(), provider: this.provider };
  }

  /**
   * Run a completion, logging latency and outcome (never the content). Throws
   * if the service is disabled — callers must gate on `isEnabled()` first, but
   * this is a hard backstop so a missed gate fails loudly rather than silently
   * hitting a provider.
   */
  async generate(feature: string, prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.client) throw new Error('AI is not enabled');
    const startedAt = Date.now();
    try {
      const text = await this.client.generate(prompt, options);
      aiLogger.info('generate.ok', { feature, provider: this.provider, ms: Date.now() - startedAt });
      return text;
    } catch (error) {
      aiLogger.error('generate.failed', {
        feature,
        provider: this.provider,
        ms: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'unknown',
      });
      throw error;
    }
  }
}
