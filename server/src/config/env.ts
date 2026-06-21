import dotenv from 'dotenv';
import type { AIProvider } from '@taskflow/shared';

dotenv.config();

/** Read a required env var, throwing a clear error if it is missing. */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Read an optional env var, returning undefined when unset or blank. */
function optional(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === '' ? undefined : value;
}

/** Normalize the configured AI provider; anything unrecognized disables AI. */
function parseAiProvider(raw: string | undefined): AIProvider {
  return raw === 'openai' || raw === 'ollama' ? raw : 'none';
}

/**
 * AI configuration. Provider selection is config-only and the default is
 * `none`, so the app runs fully with zero AI setup. Credentials/models are
 * read here once; whether AI is actually *enabled* is decided by the AI
 * service (a provider alone is not enough — it must also have its creds).
 */
const ai = {
  provider: parseAiProvider(optional('AI_PROVIDER')),
  openai: {
    apiKey: optional('OPENAI_API_KEY'),
    chatModel: optional('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini',
    embedModel: optional('OPENAI_EMBED_MODEL') ?? 'text-embedding-3-small',
    baseUrl: optional('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
  },
  ollama: {
    url: optional('OLLAMA_URL') ?? 'http://localhost:11434',
    chatModel: optional('OLLAMA_MODEL') ?? 'llama3.1',
    embedModel: optional('OLLAMA_EMBED_MODEL') ?? 'nomic-embed-text',
  },
  /** Max AI requests per user per rolling minute (defense against cost blow-ups). */
  rateLimitPerMinute: Number.parseInt(optional('AI_RATE_LIMIT_PER_MINUTE') ?? '10', 10),
  /** Per-request timeout (ms) for outbound LLM calls. */
  requestTimeoutMs: Number.parseInt(optional('AI_REQUEST_TIMEOUT_MS') ?? '30000', 10),
} as const;

/** Strongly-typed, validated view of the process environment. */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(required('PORT', '4000'), 10),
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  clientUrl: required('CLIENT_URL', 'http://localhost:5173'),
  ai,
} as const;

export type Env = typeof env;
export type AiEnv = typeof ai;
