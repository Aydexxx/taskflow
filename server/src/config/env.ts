import dotenv from 'dotenv';

dotenv.config();

/** Read a required env var, throwing a clear error if it is missing. */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Strongly-typed, validated view of the process environment. */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(required('PORT', '4000'), 10),
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  clientUrl: required('CLIENT_URL', 'http://localhost:5173'),
} as const;

export type Env = typeof env;
