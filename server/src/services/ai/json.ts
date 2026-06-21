import type { ZodSchema } from 'zod';

/**
 * Defensively parse a structured JSON object out of a raw LLM completion and
 * validate it against `schema`.
 *
 * LLMs frequently wrap JSON in prose or ```json code fences, or emit trailing
 * commentary. We strip fences, then fall back to slicing the first balanced
 * `{...}`/`[...]` span before parsing. Returns `null` (rather than throwing) on
 * anything malformed or schema-invalid, so every feature can degrade
 * gracefully to a fallback instead of failing the request.
 */
export function parseStructured<T>(raw: string, schema: ZodSchema<T>): T | null {
  for (const candidate of jsonCandidates(raw)) {
    let value: unknown;
    try {
      value = JSON.parse(candidate);
    } catch {
      continue;
    }
    const result = schema.safeParse(value);
    if (result.success) return result.data;
  }
  return null;
}

/** Yields progressively more aggressive attempts to isolate a JSON payload. */
function* jsonCandidates(raw: string): Generator<string> {
  const trimmed = raw.trim();
  yield trimmed;

  const fenced = stripCodeFence(trimmed);
  if (fenced !== trimmed) yield fenced;

  const objectSpan = balancedSpan(trimmed, '{', '}');
  if (objectSpan) yield objectSpan;

  const arraySpan = balancedSpan(trimmed, '[', ']');
  if (arraySpan) yield arraySpan;
}

/** Remove a single surrounding ```/```json fence if present. */
function stripCodeFence(text: string): string {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  return match ? (match[1] as string).trim() : text;
}

/** Extract the first balanced bracket span, so trailing prose after `}` is ignored. */
function balancedSpan(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
