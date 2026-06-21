import type { Request, Response } from 'express';
import type { NotificationWithActor } from '@taskflow/shared';
import { currentUserId } from '../middleware/auth';
import * as notificationService from '../services/notifications';

export async function listNotifications(req: Request, res: Response<NotificationWithActor[]>): Promise<void> {
  const notifications = await notificationService.listNotifications(currentUserId(req));
  res.json(notifications);
}

export async function markRead(
  req: Request<{ notificationId: string }>,
  res: Response<NotificationWithActor>,
): Promise<void> {
  const notification = await notificationService.markRead(req.params.notificationId, currentUserId(req));
  res.json(notification);
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  await notificationService.markAllRead(currentUserId(req));
  res.status(204).end();
}
