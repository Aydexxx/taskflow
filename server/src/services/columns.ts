import type { Column as PrismaColumn } from '@prisma/client';
import type { Column } from '@taskflow/shared';
import type { CreateColumnInput, UpdateColumnInput } from '../validation/column.schemas';
import { prisma } from './prisma';
import { computeInsertPosition } from './positioning';
import { requireWorkspaceMember, resolveBoardWorkspaceId, resolveColumnContext } from './authorization';
import { boardBus } from '../events/boardBus';
import { recordActivity } from './activity';

export function toColumn(column: PrismaColumn): Column {
  return {
    id: column.id,
    boardId: column.boardId,
    title: column.title,
    position: column.position,
    createdAt: column.createdAt.toISOString(),
    updatedAt: column.updatedAt.toISOString(),
  };
}

export async function createColumn(boardId: string, userId: string, input: CreateColumnInput): Promise<Column> {
  const workspaceId = await resolveBoardWorkspaceId(boardId);
  await requireWorkspaceMember(workspaceId, userId);

  const column = await prisma.$transaction(async (tx) => {
    const siblings = await tx.column.findMany({ where: { boardId }, orderBy: { position: 'asc' } });
    const position = computeInsertPosition(siblings, input.index ?? siblings.length);
    return tx.column.create({ data: { boardId, title: input.title, position } });
  });
  const result = toColumn(column);
  boardBus.publish('column:created', { boardId, actorId: userId, column: result });
  await recordActivity(boardId, userId, 'column_created', { columnId: result.id, columnTitle: result.title });
  return result;
}

export async function updateColumn(columnId: string, userId: string, input: UpdateColumnInput): Promise<Column> {
  const { boardId, workspaceId } = await resolveColumnContext(columnId);
  await requireWorkspaceMember(workspaceId, userId);

  const column = await prisma.$transaction(async (tx) => {
    const data: { title?: string; position?: number } = { title: input.title };

    if (input.index !== undefined) {
      const siblings = await tx.column.findMany({
        where: { boardId, id: { not: columnId } },
        orderBy: { position: 'asc' },
      });
      data.position = computeInsertPosition(siblings, input.index);
    }

    return tx.column.update({ where: { id: columnId }, data });
  });
  const result = toColumn(column);
  boardBus.publish('column:updated', { boardId, actorId: userId, column: result });
  return result;
}

export async function deleteColumn(columnId: string, userId: string): Promise<void> {
  const { boardId, workspaceId } = await resolveColumnContext(columnId);
  await requireWorkspaceMember(workspaceId, userId);
  const column = await prisma.column.findUniqueOrThrow({ where: { id: columnId }, select: { title: true } });
  await prisma.column.delete({ where: { id: columnId } });
  boardBus.publish('column:deleted', { boardId, actorId: userId, columnId });
  await recordActivity(boardId, userId, 'column_deleted', { columnId, columnTitle: column.title });
}
