import { Router } from 'express';
import { createCard, deleteColumn, updateColumn } from '../controllers/columns.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateColumnSchema } from '../validation/column.schemas';
import { createCardSchema } from '../validation/card.schemas';

const router = Router();

router.patch('/:columnId', requireAuth, validateBody(updateColumnSchema), asyncHandler(updateColumn));
router.delete('/:columnId', requireAuth, asyncHandler(deleteColumn));

router.post('/:columnId/cards', requireAuth, validateBody(createCardSchema), asyncHandler(createCard));

export default router;
