import type { NotificationWithActor } from '@taskflow/shared';

/** Human-readable summary for a notification, mirroring `ActivityFeed`'s `describeActivity`. */
export function describeNotification(notification: NotificationWithActor): string {
  const actor = notification.actor.name;
  const { cardTitle } = notification.metadata;
  switch (notification.type) {
    case 'mention':
      return `${actor} mentioned you on "${cardTitle}"`;
    case 'assignment':
      return `${actor} assigned you to "${cardTitle}"`;
    case 'comment':
      return `${actor} commented on "${cardTitle}"`;
    default:
      return `${actor} updated "${cardTitle}"`;
  }
}
