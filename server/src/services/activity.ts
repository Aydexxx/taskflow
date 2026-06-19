import type { Activity as PrismaActivity, User as PrismaUser } from '@prisma/client';
import type { ActivityMetadata, ActivityType, ActivityWithActor } from '@taskflow/shared';
import { prisma } from './prisma';
import { toSafeUser } from './users';
import { requireWorkspaceMember, resolveBoardWorkspaceId } from './authorization';
import { boardBus } from '../events/boardBus';

function toActivity(activity: PrismaActivity & { actor: PrismaUser }): ActivityWithActor {
  return {
    id: activity.id,
    boardId: activity.boardId,
    actorId: activity.actorId,
    type: activity.type as ActivityType,
    metadata: JSON.parse(activity.metadata) as ActivityMetadata,
    createdAt: activity.createdAt.toISOString(),
    actor: toSafeUser(activity.actor),
  };
}

/**
 * Records a board activity entry and broadcasts it to the board's room.
 *
 * Called from the other services (cards, columns, comments, labels) right
 * after the mutation they describe succeeds, while the full entity (title,
 * names, etc.) is still in hand — metadata is denormalized at write time so
 * the feed reads correctly even after the referenced entity is later renamed
 * or deleted.
 */
export async function recordActivity(
  boardId: string,
  actorId: string,
  type: ActivityType,
  metadata: ActivityMetadata,
): Promise<void> {
  const activity = await prisma.activity.create({
    data: { boardId, actorId, type, metadata: JSON.stringify(metadata) },
    include: { actor: true },
  });
  const result = toActivity(activity);
  boardBus.publish('activity:created', { boardId, actorId, activity: result });
}

export async function listActivity(boardId: string, userId: string): Promise<ActivityWithActor[]> {
  const workspaceId = await resolveBoardWorkspaceId(boardId);
  await requireWorkspaceMember(workspaceId, userId);

  const activities = await prisma.activity.findMany({
    where: { boardId },
    include: { actor: true },
    // id (cuid) is monotonically increasing and breaks ties when two entries
    // land in the same createdAt millisecond.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
  });
  return activities.map(toActivity);
}
