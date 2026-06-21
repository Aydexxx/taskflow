import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseStructured } from '../services/ai/json';
import { checkRateLimit, resetRateLimits } from '../services/ai/rateLimit';

describe('parseStructured', () => {
  const schema = z.object({ subtasks: z.array(z.string()) });

  it('parses a bare JSON object', () => {
    expect(parseStructured('{"subtasks":["a","b"]}', schema)).toEqual({ subtasks: ['a', 'b'] });
  });

  it('strips a ```json code fence', () => {
    expect(parseStructured('```json\n{"subtasks":["a"]}\n```', schema)).toEqual({ subtasks: ['a'] });
  });

  it('ignores prose surrounding a balanced object', () => {
    expect(parseStructured('Here you go: {"subtasks":["a"]} — enjoy!', schema)).toEqual({ subtasks: ['a'] });
  });

  it('returns null for unparseable text', () => {
    expect(parseStructured('no json here', schema)).toBeNull();
  });

  it('returns null when JSON is valid but fails the schema', () => {
    expect(parseStructured('{"subtasks":"not-an-array"}', schema)).toBeNull();
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits());

  it('allows up to the limit then blocks', () => {
    const now = 1_000_000;
    expect(checkRateLimit('u1', 2, now).allowed).toBe(true);
    expect(checkRateLimit('u1', 2, now).allowed).toBe(true);
    const third = checkRateLimit('u1', 2, now);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks budgets independently per user', () => {
    const now = 2_000_000;
    checkRateLimit('a', 1, now);
    expect(checkRateLimit('a', 1, now).allowed).toBe(false);
    expect(checkRateLimit('b', 1, now).allowed).toBe(true);
  });

  it('frees up slots after the window elapses', () => {
    const start = 3_000_000;
    expect(checkRateLimit('u2', 1, start).allowed).toBe(true);
    expect(checkRateLimit('u2', 1, start + 1_000).allowed).toBe(false);
    expect(checkRateLimit('u2', 1, start + 61_000).allowed).toBe(true);
  });
});
