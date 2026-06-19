import { Router } from 'express';
import { deleteLabel } from '../controllers/labels.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.delete('/:labelId', requireAuth, asyncHandler(deleteLabel));

export default router;
