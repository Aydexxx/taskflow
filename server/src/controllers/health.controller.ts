import type { Request, Response } from 'express';
import type { HealthResponse } from '@taskflow/shared';
import { getAiService } from '../services/ai';

/** GET /api/health -> liveness probe with the current server time and AI availability. */
export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  res.json({ status: 'ok', time: new Date().toISOString(), ai: getAiService().status() });
}
