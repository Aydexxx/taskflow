import type { Card as PrismaCard, CardLabel as PrismaCardLabel, Label as PrismaLabel, Prisma } from '@prisma/client';
import type { Card, CardPriority, Label, LabelColor } from '@taskflow/shared';
import type { CreateCardInput, MoveCardInput, UpdateCardInput } from '../validation/card.schemas';
import { prisma } from './prisma';
import { computeInsertPosition } from './positioning';
import { getMembership, requireWorkspaceRole, resolveCardContext, resolveColumnContext } from './authorization';
import { ValidationError } from '../errors/HttpError';
import { boardBus } from '../events/boardBus';
import { recordActivity } from './activity';
import { createNotification } from './notifications';

const CARD_INCLUDE = { labels: { include: { label: true } } } as const;

type PrismaCardWithLabels = PrismaCard & { labels: Array<PrismaCardLabel & { label: PrismaLabel }> };

/** Private to this module — `labels.ts` maps `Label` rows on its own to avoid a cross-module import cycle. */
function toLabel(label: PrismaLabel): Label {
  return {
    id: label.id,
    workspaceId: label.workspaceId,
    name: label.name,
    color: label.color as LabelColor,
    createdAt: label.createdAt.toISOString(),
  };
}

export function toCard(card: PrismaCardWithLabels): Card {
  return {
    id: card.id,
    columnId: card.columnId,
    title: card.title,
    description: card.description,
    position: card.position,
    assigneeId: card.assigneeId,
    priority: card.priority as CardPriority,
    labels: card.labels.map((cardLabel) => toLabel(cardLabel.label)),
    dueDate: card.dueDate ? card.dueDate.toISOString() : null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

/** A card's assignee must belong to the same workspace as the card itself. */
async function assertAssigneeIsMember(workspaceId: string, assigneeId: string): Promise<void> {
  const membership = await getMembership(workspaceId, assigneeId);
  if (!membership) throw new ValidationError('Assignee must be a member of this workspace');
}

/** Re-fetches a card (with labels) and publishes it as a `card:updated` event. Used by services that mutate a card's labels without going through `updateCard`. */
export async function publishCardUpdated(boardId: string, actorId: string, cardId: string): Promise<Card> {
  const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, include: CARD_INCLUDE });
  const result = toCard(card);
  boardBus.publish('card:updated', { boardId, actorId, card: result });
  return result;
}

export async function createCard(columnId: string, userId: string, input: CreateCardInput): Promise<Card> {
  const { boardId, workspaceId } = await resolveColumnContext(columnId);
  await requireWorkspaceRole(workspaceId, userId, 'MEMBER');
  if (input.assigneeId) await assertAssigneeIsMember(workspaceId, input.assigneeId);

  const card = await prisma.$transaction(async (tx) => {
    const siblings = await tx.card.findMany({ where: { columnId }, orderBy: { position: 'asc' } });
    const position = computeInsertPosition(siblings, input.index ?? siblings.length);
    return tx.card.create({
      data: {
        columnId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        position,
      },
      include: CARD_INCLUDE,
    });
  });
  const result = toCard(card);
  boardBus.publish('card:created', { boardId, actorId: userId, card: result });
  await recordActivity(boardId, userId, 'card_created', { cardId: result.id, cardTitle: result.title });
  if (result.assigneeId) {
    await createNotification({
      userId: result.assigneeId,
      actorId: userId,
      boardId,
      type: 'assignment',
      metadata: { cardId: result.id, cardTitle: result.title },
    });
  }
  return result;
}

export async function updateCard(cardId: string, userId: string, input: UpdateCardInput): Promise<Card> {
  const { boardId, workspaceId } = await resolveCardContext(cardId);
  await requireWorkspaceRole(workspaceId, userId, 'MEMBER');
  if (input.assigneeId) await assertAssigneeIsMember(workspaceId, input.assigneeId);

  const existing = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, select: { assigneeId: true } });

  const data: Prisma.CardUncheckedUpdateInput = {
    title: input.title,
    description: input.description,
    assigneeId: input.assigneeId,
    priority: input.priority,
    dueDate: input.dueDate === undefined ? undefined : input.dueDate === null ? null : new Date(input.dueDate),
  };

  const card = await prisma.card.update({ where: { id: cardId }, data, include: CARD_INCLUDE });
  const result = toCard(card);
  boardBus.publish('card:updated', { boardId, actorId: userId, card: result });

  if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
    if (input.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: input.assigneeId }, select: { name: true } });
      await recordActivity(boardId, userId, 'card_assigned', {
        cardId: result.id,
        cardTitle: result.title,
        assigneeName: assignee?.name,
      });
      await createNotification({
        userId: input.assigneeId,
        actorId: userId,
        boardId,
        type: 'assignment',
        metadata: { cardId: result.id, cardTitle: result.title },
      });
    } else {
      await recordActivity(boardId, userId, 'card_unassigned', { cardId: result.id, cardTitle: result.title });
    }
  }

  return result;
}

export async function moveCard(cardId: string, userId: string, input: MoveCardInput): Promise<Card> {
  const { columnId: sourceColumnId, boardId: sourceBoardId, workspaceId } = await resolveCardContext(cardId);
  await requireWorkspaceRole(workspaceId, userId, 'MEMBER');

  const destination = await resolveColumnContext(input.columnId);
  if (destination.workspaceId !== workspaceId) {
    throw new ValidationError('Cannot move a card to a column in a different workspace');
  }

  const card = await prisma.$transaction(async (tx) => {
    const isSameColumn = input.columnId === sourceColumnId;
    const siblings = await tx.card.findMany({
      where: { columnId: input.columnId, ...(isSameColumn ? { id: { not: cardId } } : {}) },
      orderBy: { position: 'asc' },
    });
    const position = computeInsertPosition(siblings, input.index);
    return tx.card.update({
      where: { id: cardId },
      data: { columnId: input.columnId, position },
      include: CARD_INCLUDE,
    });
  });
  const result = toCard(card);

  // Cross-board moves (allowed within a workspace) leave the source board: tell
  // its viewers the card is gone, and the destination board that it arrived.
  if (destination.boardId !== sourceBoardId) {
    boardBus.publish('card:deleted', {
      boardId: sourceBoardId,
      actorId: userId,
      cardId,
      columnId: sourceColumnId,
    });
  }
  boardBus.publish('card:moved', { boardId: destination.boardId, actorId: userId, card: result });

  // Only log a cross-column move; same-column reorders are too frequent/noisy for the feed.
  if (input.columnId !== sourceColumnId) {
    const columns = await prisma.column.findMany({
      where: { id: { in: [sourceColumnId, input.columnId] } },
      select: { id: true, title: true },
    });
    const titleById = new Map(columns.map((column) => [column.id, column.title]));
    await recordActivity(destination.boardId, userId, 'card_moved', {
      cardId: result.id,
      cardTitle: result.title,
      fromColumnTitle: titleById.get(sourceColumnId),
      toColumnTitle: titleById.get(input.columnId),
    });
  }

  return result;
}

export async function deleteCard(cardId: string, userId: string): Promise<void> {
  const { columnId, boardId, workspaceId } = await resolveCardContext(cardId);
  await requireWorkspaceRole(workspaceId, userId, 'MEMBER');
  const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, select: { title: true } });
  await prisma.card.delete({ where: { id: cardId } });
  boardBus.publish('card:deleted', { boardId, actorId: userId, cardId, columnId });
  await recordActivity(boardId, userId, 'card_deleted', { cardId, cardTitle: card.title });
}
