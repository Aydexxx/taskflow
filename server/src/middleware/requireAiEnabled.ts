import type { NextFunction, Request, Response } from 'express';
import type { ApiError } from '@taskflow/shared';
import { getAiService } from '../services/ai';

/**
 * Gate for AI routes. When no provider is configured, the AI feature set is
 * inactive: every AI endpoint responds 404, exactly as if it did not exist.
 * This keeps the "no AI configured ⇒ no AI surface" contract a single check
 * rather than scattered conditionals in each handler.
 */
export function requireAiEnabled(_req: Request, res: Response, next: NextFunction): void {
  if (!getAiService().isEnabled()) {
    const body: ApiError = { error: { message: 'Not found', code: 'NOT_FOUND' } };
    res.status(404).json(body);
    return;
  }
  next();
}
