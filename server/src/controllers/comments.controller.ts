import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth';
import * as commentService from '../services/comments';

export async function deleteComment(req: Request<{ commentId: string }>, res: Response): Promise<void> {
  await commentService.deleteComment(req.params.commentId, currentUserId(req));
  res.status(204).end();
}
