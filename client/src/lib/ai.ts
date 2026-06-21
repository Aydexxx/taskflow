import { useEffect, useState } from 'react';
import type { AIStatus } from '@taskflow/shared';
import { api } from './api';

/**
 * Client-side AI availability gate.
 *
 * The server advertises AI status on `/api/health`. We fetch it once and cache
 * the promise module-wide so every component that asks shares a single probe.
 * Until it resolves (and if it ever fails) AI is treated as OFF, so the app is
 * fully functional and shows no AI affordances by default.
 */
const DISABLED: AIStatus = { enabled: false, provider: 'none' };

let statusPromise: Promise<AIStatus> | null = null;

function fetchAiStatus(): Promise<AIStatus> {
  statusPromise ??= api
    .health()
    .then((health) => health.ai ?? DISABLED)
    .catch(() => DISABLED);
  return statusPromise;
}

/** Reset the cached probe. Exposed for tests. */
export function resetAiStatusCache(): void {
  statusPromise = null;
}

/** React hook: resolves to whether AI assist is enabled (false until known). */
export function useAiEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchAiStatus().then((status) => {
      if (active) setEnabled(status.enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  return enabled;
}
