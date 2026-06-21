import type { Request, Response } from 'express';
import type { Board, Label, Workspace, WorkspaceMemberWithUser } from '@taskflow/shared';
import { currentUserId } from '../middleware/auth';
import * as workspaceService from '../services/workspaces';
import * as boardService from '../services/boards';
import * as labelService from '../services/labels';
import type {
  AddMemberInput,
  CreateWorkspaceInput,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
} from '../validation/workspace.schemas';
import type { CreateBoardInput } from '../validation/board.schemas';
import type { CreateLabelInput } from '../validation/label.schemas';

export async function createWorkspace(
  req: Request<unknown, unknown, CreateWorkspaceInput>,
  res: Response<Workspace>,
): Promise<void> {
  const workspace = await workspaceService.createWorkspace(currentUserId(req), req.body);
  res.status(201).json(workspace);
}

export async function listMyWorkspaces(req: Request, res: Response<Workspace[]>): Promise<void> {
  const workspaces = await workspaceService.listMyWorkspaces(currentUserId(req));
  res.json(workspaces);
}

export async function getWorkspace(req: Request<{ workspaceId: string }>, res: Response<Workspace>): Promise<void> {
  const workspace = await workspaceService.getWorkspace(req.params.workspaceId, currentUserId(req));
  res.json(workspace);
}

export async function updateWorkspace(
  req: Request<{ workspaceId: string }, unknown, UpdateWorkspaceInput>,
  res: Response<Workspace>,
): Promise<void> {
  const workspace = await workspaceService.updateWorkspace(req.params.workspaceId, currentUserId(req), req.body);
  res.json(workspace);
}

export async function deleteWorkspace(req: Request<{ workspaceId: string }>, res: Response): Promise<void> {
  await workspaceService.deleteWorkspace(req.params.workspaceId, currentUserId(req));
  res.status(204).end();
}

export async function listMembers(
  req: Request<{ workspaceId: string }>,
  res: Response<WorkspaceMemberWithUser[]>,
): Promise<void> {
  const members = await workspaceService.listMembers(req.params.workspaceId, currentUserId(req));
  res.json(members);
}

export async function addMember(
  req: Request<{ workspaceId: string }, unknown, AddMemberInput>,
  res: Response<WorkspaceMemberWithUser>,
): Promise<void> {
  const member = await workspaceService.addMember(req.params.workspaceId, currentUserId(req), req.body);
  res.status(201).json(member);
}

export async function updateMemberRole(
  req: Request<{ workspaceId: string; memberId: string }, unknown, UpdateMemberRoleInput>,
  res: Response<WorkspaceMemberWithUser>,
): Promise<void> {
  const member = await workspaceService.updateMemberRole(
    req.params.workspaceId,
    currentUserId(req),
    req.params.memberId,
    req.body,
  );
  res.json(member);
}

export async function removeMember(
  req: Request<{ workspaceId: string; memberId: string }>,
  res: Response,
): Promise<void> {
  await workspaceService.removeMember(req.params.workspaceId, currentUserId(req), req.params.memberId);
  res.status(204).end();
}

export async function transferOwnership(
  req: Request<{ workspaceId: string }, unknown, TransferOwnershipInput>,
  res: Response,
): Promise<void> {
  await workspaceService.transferOwnership(req.params.workspaceId, currentUserId(req), req.body.memberId);
  res.status(204).end();
}

export async function createBoardInWorkspace(
  req: Request<{ workspaceId: string }, unknown, CreateBoardInput>,
  res: Response<Board>,
): Promise<void> {
  const board = await boardService.createBoard(req.params.workspaceId, currentUserId(req), req.body);
  res.status(201).json(board);
}

export async function listBoardsInWorkspace(req: Request<{ workspaceId: string }>, res: Response<Board[]>): Promise<void> {
  const boards = await boardService.listBoards(req.params.workspaceId, currentUserId(req));
  res.json(boards);
}

export async function listLabelsInWorkspace(req: Request<{ workspaceId: string }>, res: Response<Label[]>): Promise<void> {
  const labels = await labelService.listLabels(req.params.workspaceId, currentUserId(req));
  res.json(labels);
}

export async function createLabelInWorkspace(
  req: Request<{ workspaceId: string }, unknown, CreateLabelInput>,
  res: Response<Label>,
): Promise<void> {
  const label = await labelService.createLabel(req.params.workspaceId, currentUserId(req), req.body);
  res.status(201).json(label);
}
