import { Router } from 'express';
import {
  askBoard,
  askWorkspace,
  draftDescription,
  suggestMetadata,
  suggestSubtasks,
  summarizeBoard,
} from '../controllers/ai.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { requireAiEnabled } from '../middleware/requireAiEnabled';
import { validateBody } from '../middleware/validate';
import { askBoardSchema, askWorkspaceSchema, draftDescriptionSchema } from '../validation/ai.schemas';

const router = Router();

// Every AI route requires auth AND an enabled provider; with AI off the guard
// makes them all 404, so the feature set is genuinely inactive.
router.use(requireAuth, requireAiEnabled);

router.post('/boards/:boardId/summary', asyncHandler(summarizeBoard));
router.post('/boards/:boardId/ask', validateBody(askBoardSchema), asyncHandler(askBoard));
router.post('/workspaces/:workspaceId/ask', validateBody(askWorkspaceSchema), asyncHandler(askWorkspace));
router.post(
  '/workspaces/:workspaceId/draft-description',
  validateBody(draftDescriptionSchema),
  asyncHandler(draftDescription),
);
router.post('/cards/:cardId/subtasks', asyncHandler(suggestSubtasks));
router.post('/cards/:cardId/suggestions', asyncHandler(suggestMetadata));

export default router;
