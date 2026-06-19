import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth';
import * as labelService from '../services/labels';

export async function deleteLabel(req: Request<{ labelId: string }>, res: Response): Promise<void> {
  await labelService.deleteLabel(req.params.labelId, currentUserId(req));
  res.status(204).end();
}
