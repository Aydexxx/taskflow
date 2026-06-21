import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SOCKET_EVENTS } from '@taskflow/shared';
import type { NotificationWithActor, User } from '@taskflow/shared';

// Minimal in-memory stand-ins for the singleton socket client and the auth
// context, mirroring `useBoardRealtime.test.ts`'s pattern. Both must be built
// via `vi.hoisted` because `vi.mock` factories are hoisted above ordinary
// `let`/`const` declarations, so anything they close over has to be too.
const { fakeSocket, trigger, resetSocket } = vi.hoisted(() => {
  type Handler = (payload: unknown) => void;
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    on(event: string, handler: Handler) {
      const set = handlers.get(event) ?? new Set<Handler>();
      set.add(handler);
      handlers.set(event, set);
    },
    off(event: string, handler: Handler) {
      handlers.get(event)?.delete(handler);
    },
  };
  const trigger = (event: string, payload: unknown): void => {
    handlers.get(event)?.forEach((handler) => handler(payload));
  };
  const resetSocket = (): void => handlers.clear();
  return { fakeSocket: socket, trigger, resetSocket };
});

vi.mock('../lib/socket', () => ({ socket: fakeSocket }));

const { getCurrentUser, setCurrentUser } = vi.hoisted(() => {
  let user: User | null = null;
  return {
    getCurrentUser: () => user,
    setCurrentUser: (next: User | null) => {
      user = next;
    },
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: getCurrentUser() }),
}));

const listMock = vi.fn();
const markReadMock = vi.fn();
const markAllReadMock = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    notifications: {
      list: () => listMock(),
      markRead: (id: string) => markReadMock(id),
      markAllRead: () => markAllReadMock(),
    },
  },
}));

import { useNotifications } from './useNotifications';

const MOCK_USER: User = { id: 'user-1', email: 'ada@example.com', name: 'Ada', avatarUrl: null, createdAt: '', updatedAt: '' };

function makeNotification(overrides: Partial<NotificationWithActor> = {}): NotificationWithActor {
  return {
    id: 'n1',
    userId: 'user-1',
    actorId: 'user-2',
    boardId: 'board-1',
    type: 'mention',
    metadata: { cardId: 'card-1', cardTitle: 'Card 1' },
    isRead: false,
    createdAt: new Date().toISOString(),
    actor: { id: 'user-2', email: 'bob@example.com', name: 'Bob', avatarUrl: null, createdAt: '', updatedAt: '' },
    ...overrides,
  };
}

afterEach(() => {
  resetSocket();
  listMock.mockReset();
  markReadMock.mockReset();
  markAllReadMock.mockReset();
  setCurrentUser(MOCK_USER);
});

describe('useNotifications', () => {
  it('loads notifications on mount and computes the unread count', async () => {
    setCurrentUser(MOCK_USER);
    listMock.mockResolvedValue([makeNotification({ id: 'n1', isRead: false }), makeNotification({ id: 'n2', isRead: true })]);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(result.current.unreadCount).toBe(1);
  });

  it('does not fetch when there is no logged-in user', async () => {
    setCurrentUser(null);
    listMock.mockResolvedValue([makeNotification()]);

    const { result } = renderHook(() => useNotifications());
    await act(async () => {});

    expect(listMock).not.toHaveBeenCalled();
    expect(result.current.notifications).toEqual([]);
  });

  it('prepends a real-time notification, deduping by id', async () => {
    setCurrentUser(MOCK_USER);
    listMock.mockResolvedValue([]);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(listMock).toHaveBeenCalled());

    const created = makeNotification({ id: 'n-live' });
    act(() => trigger(SOCKET_EVENTS.NOTIFICATION_CREATED, { notification: created }));
    expect(result.current.notifications).toEqual([created]);

    // A duplicate broadcast (e.g. a missed-event replay) must not double the entry.
    act(() => trigger(SOCKET_EVENTS.NOTIFICATION_CREATED, { notification: created }));
    expect(result.current.notifications).toHaveLength(1);
  });

  it('refetches on reconnect, to recover notifications missed while disconnected', async () => {
    setCurrentUser(MOCK_USER);
    listMock.mockResolvedValue([]);
    renderHook(() => useNotifications());
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));

    act(() => trigger('connect', undefined));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });

  it('optimistically marks a single notification read', async () => {
    setCurrentUser(MOCK_USER);
    listMock.mockResolvedValue([makeNotification({ id: 'n1', isRead: false })]);
    markReadMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    await act(async () => {
      await result.current.markRead('n1');
    });

    expect(result.current.notifications[0]?.isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(markReadMock).toHaveBeenCalledWith('n1');
  });

  it('optimistically marks every notification read', async () => {
    setCurrentUser(MOCK_USER);
    listMock.mockResolvedValue([
      makeNotification({ id: 'n1', isRead: false }),
      makeNotification({ id: 'n2', isRead: false }),
    ]);
    markAllReadMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(markAllReadMock).toHaveBeenCalled();
  });
});
