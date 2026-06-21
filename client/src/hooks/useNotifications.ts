import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NotificationCreatedEvent, NotificationWithActor } from '@taskflow/shared';
import { SOCKET_EVENTS } from '@taskflow/shared';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';

interface UseNotificationsResult {
  notifications: NotificationWithActor[];
  unreadCount: number;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

/**
 * Loads the current user's notifications and keeps them live: the server
 * auto-joins every authenticated socket to its own user room (no explicit
 * join call needed here, unlike board/workspace rooms), so a `notification:
 * created` broadcast can only ever be one meant for this user.
 *
 * Persisted via the REST list, so notifications survive a reconnect or a
 * full page reload — the list is also refetched on reconnect to recover
 * anything created while the socket was disconnected.
 */
export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);

  const refresh = useCallback(() => {
    api
      .notifications.list()
      .then(setNotifications)
      .catch(() => {
        /* next refresh (reconnect, or a future open of the dropdown) reconciles */
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return undefined;
    }
    refresh();

    const onCreated = (payload: NotificationCreatedEvent): void => {
      setNotifications((current) =>
        current.some((n) => n.id === payload.notification.id) ? current : [payload.notification, ...current],
      );
    };
    const onConnect = (): void => refresh();

    socket.on(SOCKET_EVENTS.NOTIFICATION_CREATED, onCreated);
    socket.on('connect', onConnect);
    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_CREATED, onCreated);
      socket.off('connect', onConnect);
    };
  }, [user, refresh]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const markRead = useCallback(async (notificationId: string): Promise<void> => {
    setNotifications((current) => current.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
    try {
      await api.notifications.markRead(notificationId);
    } catch {
      /* next refresh reconciles */
    }
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    setNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
    try {
      await api.notifications.markAllRead();
    } catch {
      /* next refresh reconciles */
    }
  }, []);

  return { notifications, unreadCount, markRead, markAllRead };
}
