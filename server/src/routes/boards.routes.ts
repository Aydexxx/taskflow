import { Router } from 'express';
import {
  createColumn,
  deleteBoard,
  getAnalytics,
  getBoard,
  listActivity,
  updateBoard,
} from '../controllers/boards.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateBoardSchema } from '../validation/board.schemas';
import { createColumnSchema } from '../validation/column.schemas';

const router = Router();

router.get('/:boardId', requireAuth, asyncHandler(getBoard));
router.patch('/:boardId', requireAuth, validateBody(updateBoardSchema), asyncHandler(updateBoard));
router.delete('/:boardId', requireAuth, asyncHandler(deleteBoard));

router.post('/:boardId/columns', requireAuth, validateBody(createColumnSchema), asyncHandler(createColumn));

router.get('/:boardId/activity', requireAuth, asyncHandler(listActivity));
router.get('/:boardId/analytics', requireAuth, asyncHandler(getAnalytics));

export default router;
