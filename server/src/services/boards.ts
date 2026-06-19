import type {
  Board as PrismaBoard,
  Card as PrismaCard,
  CardLabel as PrismaCardLabel,
  Column as PrismaColumn,
  Label as PrismaLabel,
} from '@prisma/client';
import type { Board, BoardWithChildren } from '@taskflow/shared';
import type { CreateBoardInput, UpdateBoardInput } from '../validation/board.schemas';
import { prisma } from './prisma';
import { toCard } from './cards';
import { toColumn } from './columns';
import { requireWorkspaceMember, resolveBoardWorkspaceId } from './authorization';
import { NotFoundError } from '../errors/HttpError';

export function toBoard(board: PrismaBoard): Board {
  return {
    id: board.id,
    workspaceId: board.workspaceId,
    title: board.title,
    description: board.description,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

type CardWithLabels = PrismaCard & { labels: Array<PrismaCardLabel & { label: PrismaLabel }> };

type BoardWithColumnsAndCards = PrismaBoard & {
  columns: Array<PrismaColumn & { cards: CardWithLabels[] }>;
};

export function toBoardWithChildren(board: BoardWithColumnsAndCards): BoardWithChildren {
  return {
    ...toBoard(board),
    columns: board.columns.map((column) => ({
      ...toColumn(column),
      cards: column.cards.map(toCard),
    })),
  };
}

export async function createBoard(workspaceId: string, userId: string, input: CreateBoardInput): Promise<Board> {
  await requireWorkspaceMember(workspaceId, userId);
  const board = await prisma.board.create({
    data: { workspaceId, title: input.title, description: input.description },
  });
  return toBoard(board);
}

export async function listBoards(workspaceId: string, userId: string): Promise<Board[]> {
  await requireWorkspaceMember(workspaceId, userId);
  const boards = await prisma.board.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
  return boards.map(toBoard);
}

export async function getBoardWithChildren(boardId: string, userId: string): Promise<BoardWithChildren> {
  const workspaceId = await resolveBoardWorkspaceId(boardId);
  await requireWorkspaceMember(workspaceId, userId);

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: { labels: { include: { label: true } } },
          },
        },
      },
    },
  });
  if (!board) throw new NotFoundError('Board not found');
  return toBoardWithChildren(board);
}

export async function updateBoard(boardId: string, userId: string, input: UpdateBoardInput): Promise<Board> {
  const workspaceId = await resolveBoardWorkspaceId(boardId);
  await requireWorkspaceMember(workspaceId, userId);

  const board = await prisma.board.update({
    where: { id: boardId },
    data: { title: input.title, description: input.description },
  });
  return toBoard(board);
}

export async function deleteBoard(boardId: string, userId: string): Promise<void> {
  const workspaceId = await resolveBoardWorkspaceId(boardId);
  await requireWorkspaceMember(workspaceId, userId);
  await prisma.board.delete({ where: { id: boardId } });
}
