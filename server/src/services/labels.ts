import type { Label as PrismaLabel } from '@prisma/client';
import type { Card, Label, LabelColor } from '@taskflow/shared';
import type { CreateLabelInput } from '../validation/label.schemas';
import { prisma } from './prisma';
import { requireWorkspaceMember, resolveCardContext } from './authorization';
import { NotFoundError } from '../errors/HttpError';
import { recordActivity } from './activity';
import { publishCardUpdated } from './cards';

function toLabel(label: PrismaLabel): Label {
  return {
    id: label.id,
    workspaceId: label.workspaceId,
    name: label.name,
    color: label.color as LabelColor,
    createdAt: label.createdAt.toISOString(),
  };
}

export async function listLabels(workspaceId: string, userId: string): Promise<Label[]> {
  await requireWorkspaceMember(workspaceId, userId);
  const labels = await prisma.label.findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
  return labels.map(toLabel);
}

export async function createLabel(workspaceId: string, userId: string, input: CreateLabelInput): Promise<Label> {
  await requireWorkspaceMember(workspaceId, userId);
  const label = await prisma.label.create({
    data: { workspaceId, name: input.name, color: input.color },
  });
  return toLabel(label);
}

export async function deleteLabel(labelId: string, userId: string): Promise<void> {
  const label = await prisma.label.findUniqueOrThrow({ where: { id: labelId } });
  await requireWorkspaceMember(label.workspaceId, userId);
  await prisma.label.delete({ where: { id: labelId } });
}

async function getCardScopedLabel(cardId: string, labelId: string): Promise<{ label: PrismaLabel; boardId: string }> {
  const { boardId, workspaceId } = await resolveCardContext(cardId);
  const label = await prisma.label.findUnique({ where: { id: labelId } });
  if (!label || label.workspaceId !== workspaceId) throw new NotFoundError('Label not found');
  return { label, boardId };
}

export async function addLabelToCard(cardId: string, labelId: string, userId: string): Promise<Card> {
  const { label, boardId } = await getCardScopedLabel(cardId, labelId);
  await requireWorkspaceMember(label.workspaceId, userId);

  await prisma.cardLabel.upsert({
    where: { cardId_labelId: { cardId, labelId } },
    create: { cardId, labelId },
    update: {},
  });

  const card = await publishCardUpdated(boardId, userId, cardId);
  await recordActivity(boardId, userId, 'card_label_added', {
    cardId: card.id,
    cardTitle: card.title,
    labelName: label.name,
    labelColor: label.color as LabelColor,
  });
  return card;
}

export async function removeLabelFromCard(cardId: string, labelId: string, userId: string): Promise<Card> {
  const { label, boardId } = await getCardScopedLabel(cardId, labelId);
  await requireWorkspaceMember(label.workspaceId, userId);

  await prisma.cardLabel.deleteMany({ where: { cardId, labelId } });

  const card = await publishCardUpdated(boardId, userId, cardId);
  await recordActivity(boardId, userId, 'card_label_removed', {
    cardId: card.id,
    cardTitle: card.title,
    labelName: label.name,
    labelColor: label.color as LabelColor,
  });
  return card;
}
