import type { Request, Response } from 'express';
import type { HealthResponse } from '@taskflow/shared';

/** GET /api/health -> liveness probe with the current server time. */
export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  res.json({ status: 'ok', time: new Date().toISOString() });
}
