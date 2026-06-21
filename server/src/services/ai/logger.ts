/**
 * Minimal structured logger for the AI subsystem. Emits one JSON line per
 * event so AI activity is greppable and parseable in aggregation tools,
 * separate from the app's ad-hoc `console.error('[error]', …)` call sites.
 *
 * Never throws and never includes prompt/response bodies (only metadata such
 * as feature, provider, latency, and outcome), so logging an AI call can't
 * leak workspace content or crash a request.
 */
type LogLevel = 'info' | 'warn' | 'error';

type LogFields = Record<string, string | number | boolean | undefined>;

function emit(level: LogLevel, event: string, fields: LogFields): void {
  const line = JSON.stringify({ scope: 'ai', level, event, ts: new Date().toISOString(), ...fields });
  // The repo routes all logging through reviewed call sites; this is one of them.
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : console.log)(line);
}

export const aiLogger = {
  info: (event: string, fields: LogFields = {}): void => emit('info', event, fields),
  warn: (event: string, fields: LogFields = {}): void => emit('warn', event, fields),
  error: (event: string, fields: LogFields = {}): void => emit('error', event, fields),
};
