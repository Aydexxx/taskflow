import { Router } from 'express';
import { deleteComment } from '../controllers/comments.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.delete('/:commentId', requireAuth, asyncHandler(deleteComment));

export default router;
