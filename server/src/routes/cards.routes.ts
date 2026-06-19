import { Router } from 'express';
import {
  addLabel,
  createComment,
  deleteCard,
  listComments,
  moveCard,
  removeLabel,
  updateCard,
} from '../controllers/cards.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { moveCardSchema, updateCardSchema } from '../validation/card.schemas';
import { attachLabelSchema } from '../validation/label.schemas';
import { createCommentSchema } from '../validation/comment.schemas';

const router = Router();

router.patch('/:cardId', requireAuth, validateBody(updateCardSchema), asyncHandler(updateCard));
router.patch('/:cardId/move', requireAuth, validateBody(moveCardSchema), asyncHandler(moveCard));
router.delete('/:cardId', requireAuth, asyncHandler(deleteCard));

router.post('/:cardId/labels', requireAuth, validateBody(attachLabelSchema), asyncHandler(addLabel));
router.delete('/:cardId/labels/:labelId', requireAuth, asyncHandler(removeLabel));

router.get('/:cardId/comments', requireAuth, asyncHandler(listComments));
router.post('/:cardId/comments', requireAuth, validateBody(createCommentSchema), asyncHandler(createComment));

export default router;
