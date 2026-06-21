import type { Notification as PrismaNotification, User as PrismaUser } from '@prisma/client';
import type { NotificationMetadata, NotificationType, NotificationWithActor } from '@taskflow/shared';
import { prisma } from './prisma';
import { toSafeUser } from './users';
import { ForbiddenError, NotFoundError } from '../errors/HttpError';
import { notificationBus } from '../events/notificationBus';

function toNotification(notification: PrismaNotification & { actor: PrismaUser }): NotificationWithActor {
  return {
    id: notification.id,
    userId: notification.userId,
    actorId: notification.actorId,
    boardId: notification.boardId,
    type: notification.type as NotificationType,
    metadata: JSON.parse(notification.metadata) as NotificationMetadata,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
    actor: toSafeUser(notification.actor),
  };
}

export interface CreateNotificationInput {
  userId: string;
  actorId: string;
  boardId: string;
  type: NotificationType;
  metadata: NotificationMetadata;
}

/**
 * Records a notification for `userId` and broadcasts it to their personal
 * socket room. A no-op when the recipient is the actor themselves — mentioning
 * yourself, assigning a card to yourself, or commenting on your own card
 * should never notify you about your own action.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (input.userId === input.actorId) return;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      boardId: input.boardId,
      type: input.type,
      metadata: JSON.stringify(input.metadata),
    },
    include: { actor: true },
  });
  const result = toNotification(notification);
  notificationBus.publish('notification:created', { userId: input.userId, notification: result });
}

/** Most recent notifications for `userId`, newest first. */
export async function listNotifications(userId: string): Promise<NotificationWithActor[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    include: { actor: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
  });
  return notifications.map(toNotification);
}

async function requireOwnNotification(notificationId: string, userId: string): Promise<PrismaNotification> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError('Notification not found');
  if (notification.userId !== userId) throw new ForbiddenError('You do not have access to this notification');
  return notification;
}

export async function markRead(notificationId: string, userId: string): Promise<NotificationWithActor> {
  await requireOwnNotification(notificationId, userId);
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
    include: { actor: true },
  });
  return toNotification(notification);
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
