/**
 * In-memory, per-user sliding-window rate limiter for AI calls.
 *
 * AI requests are comparatively expensive (latency + provider cost), so each
 * user gets a capped budget per rolling minute. In-memory state is fine for a
 * single-process deployment; a multi-instance setup would swap this for a
 * shared store, but the call sites wouldn't change.
 */
const WINDOW_MS = 60_000;

/** userId -> ascending list of recent request timestamps (ms) within the window. */
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still available in the current window after this call. */
  remaining: number;
  /** Seconds until the window frees up a slot (only meaningful when blocked). */
  retryAfterSeconds: number;
}

/**
 * Record an attempt for `userId` and report whether it is allowed. A blocked
 * attempt is NOT counted against the user (so spamming while blocked doesn't
 * extend the penalty).
 */
export function checkRateLimit(userId: string, limitPerMinute: number, now: number = Date.now()): RateLimitResult {
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(userId) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= limitPerMinute) {
    const oldest = recent[0] ?? now;
    hits.set(userId, recent);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(userId, recent);
  return { allowed: true, remaining: Math.max(0, limitPerMinute - recent.length), retryAfterSeconds: 0 };
}

/** Clear all rate-limit state. Used between tests to keep them independent. */
export function resetRateLimits(): void {
  hits.clear();
}
