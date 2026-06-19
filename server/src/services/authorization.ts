import type { Prisma, PrismaClient, WorkspaceMember as PrismaWorkspaceMember } from '@prisma/client';
import type { WorkspaceRole } from '@taskflow/shared';
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

/** Throws `ForbiddenError` unless the user's role in the workspace is one of `roles`. */
export async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  roles: WorkspaceRole[],
  db: Db = prisma,
): Promise<PrismaWorkspaceMember> {
  const membership = await requireWorkspaceMember(workspaceId, userId, db);
  if (!roles.includes(membership.role as WorkspaceRole)) {
    throw new ForbiddenError('You do not have permission to perform this action');
  }
  return membership;
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
