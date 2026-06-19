import { Router } from 'express';
import {
  addMember,
  createBoardInWorkspace,
  createLabelInWorkspace,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listBoardsInWorkspace,
  listLabelsInWorkspace,
  listMembers,
  listMyWorkspaces,
  updateWorkspace,
} from '../controllers/workspaces.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { addMemberSchema, createWorkspaceSchema, updateWorkspaceSchema } from '../validation/workspace.schemas';
import { createBoardSchema } from '../validation/board.schemas';
import { createLabelSchema } from '../validation/label.schemas';

const router = Router();

router.post('/', requireAuth, validateBody(createWorkspaceSchema), asyncHandler(createWorkspace));
router.get('/', requireAuth, asyncHandler(listMyWorkspaces));
router.get('/:workspaceId', requireAuth, asyncHandler(getWorkspace));
router.patch('/:workspaceId', requireAuth, validateBody(updateWorkspaceSchema), asyncHandler(updateWorkspace));
router.delete('/:workspaceId', requireAuth, asyncHandler(deleteWorkspace));

router.get('/:workspaceId/members', requireAuth, asyncHandler(listMembers));
router.post('/:workspaceId/members', requireAuth, validateBody(addMemberSchema), asyncHandler(addMember));

router.post('/:workspaceId/boards', requireAuth, validateBody(createBoardSchema), asyncHandler(createBoardInWorkspace));
router.get('/:workspaceId/boards', requireAuth, asyncHandler(listBoardsInWorkspace));

router.get('/:workspaceId/labels', requireAuth, asyncHandler(listLabelsInWorkspace));
router.post('/:workspaceId/labels', requireAuth, validateBody(createLabelSchema), asyncHandler(createLabelInWorkspace));

export default router;
