/** Thrown when an outbound LLM HTTP call fails, times out, or returns non-2xx. */
export class LlmTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmTransportError';
  }
}

/**
 * `fetch` a JSON endpoint with a hard timeout, returning the parsed body.
 * Throws `LlmTransportError` on timeout, network failure, or a non-2xx status —
 * callers translate that into a graceful, user-facing AI error.
 */
export async function postJson<T>(url: string, body: unknown, headers: Record<string, string>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new LlmTransportError(`Upstream returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof LlmTransportError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LlmTransportError(`Request timed out after ${timeoutMs}ms`);
    }
    throw new LlmTransportError(error instanceof Error ? error.message : 'Unknown transport error');
  } finally {
    clearTimeout(timer);
  }
}
