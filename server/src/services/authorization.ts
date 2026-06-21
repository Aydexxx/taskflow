import type { Prisma, PrismaClient, WorkspaceMember as PrismaWorkspaceMember } from '@prisma/client';
import { WORKSPACE_ROLE_RANK, roleAtLeast, type WorkspaceRole } from '@taskflow/shared';
import { prisma } from './prisma';
import { ForbiddenError, NotFoundError } from '../errors/HttpError';

/** A Prisma client or an interactive-transaction client; authorization checks work inside either. */
type Db = PrismaClient | Prisma.TransactionClient;

export function getMembership(
  workspaceId: string,
  userId: string,
  db: Db = prisma,
): Promise<PrismaWorkspaceMember | null> {
  return db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
}

/** Throws `ForbiddenError` unless the user has any membership in the workspace. */
export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string,
  db: Db = prisma,
): Promise<PrismaWorkspaceMember> {
  const membership = await getMembership(workspaceId, userId, db);
  if (!membership) throw new ForbiddenError('You are not a member of this workspace');
  return membership;
}

/** Throws `ForbiddenError` unless the user's role in the workspace is at least `minRole`. */
export async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  minRole: WorkspaceRole,
  db: Db = prisma,
): Promise<PrismaWorkspaceMember> {
  const membership = await requireWorkspaceMember(workspaceId, userId, db);
  if (!roleAtLeast(membership.role as WorkspaceRole, minRole)) {
    throw new ForbiddenError(`This action requires the ${minRole} role or higher`);
  }
  return membership;
}

/** Throws `ForbiddenError` if `role` outranks `actingRole` — a user can never grant a role higher than their own. */
export function assertCanGrantRole(actingRole: WorkspaceRole, role: WorkspaceRole): void {
  if (WORKSPACE_ROLE_RANK[role] > WORKSPACE_ROLE_RANK[actingRole]) {
    throw new ForbiddenError('You cannot grant a role higher than your own');
  }
}

/** Throws `ForbiddenError` unless `actingRole` strictly outranks `targetRole` — managing a member (changing their role or removing them) requires more privilege than they currently have. This also blocks anyone from managing the OWNER, since no role outranks it. */
export function assertCanManageMember(actingRole: WorkspaceRole, targetRole: WorkspaceRole): void {
  if (WORKSPACE_ROLE_RANK[actingRole] <= WORKSPACE_ROLE_RANK[targetRole]) {
    throw new ForbiddenError('You do not have authority to manage this member');
  }
}

/** Resolves the workspace that owns a board, throwing `NotFoundError` if the board doesn't exist. */
export async function resolveBoardWorkspaceId(boardId: string, db: Db = prisma): Promise<string> {
  const board = await db.board.findUnique({ where: { id: boardId }, select: { workspaceId: true } });
  if (!board) throw new NotFoundError('Board not found');
  return board.workspaceId;
}

/** Resolves the board and workspace that own a column, throwing `NotFoundError` if the column doesn't exist. */
export async function resolveColumnContext(
  columnId: string,
  db: Db = prisma,
): Promise<{ boardId: string; workspaceId: string }> {
  const column = await db.column.findUnique({
    where: { id: columnId },
    select: { boardId: true, board: { select: { workspaceId: true } } },
  });
  if (!column) throw new NotFoundError('Column not found');
  return { boardId: column.boardId, workspaceId: column.board.workspaceId };
}

/** Resolves the column, board, and workspace that own a card, throwing `NotFoundError` if the card doesn't exist. */
export async function resolveCardContext(
  cardId: string,
  db: Db = prisma,
): Promise<{ columnId: string; boardId: string; workspaceId: string }> {
  const card = await db.card.findUnique({
    where: { id: cardId },
    select: { columnId: true, column: { select: { boardId: true, board: { select: { workspaceId: true } } } } },
  });
  if (!card) throw new NotFoundError('Card not found');
  return {
    columnId: card.columnId,
    boardId: card.column.boardId,
    workspaceId: card.column.board.workspaceId,
  };
}
