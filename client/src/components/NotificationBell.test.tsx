import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { NotificationWithActor } from '@taskflow/shared';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

const markReadMock = vi.fn();
const markAllReadMock = vi.fn();

const { getNotifications, setNotifications } = vi.hoisted(() => {
  let notifications: NotificationWithActor[] = [];
  return {
    getNotifications: () => notifications,
    setNotifications: (next: NotificationWithActor[]) => {
      notifications = next;
    },
  };
});

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => {
    const notifications = getNotifications();
    return {
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
      markRead: markReadMock,
      markAllRead: markAllReadMock,
    };
  },
}));

import { NotificationBell } from './NotificationBell';

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
  navigateMock.mockReset();
  markReadMock.mockReset();
  markAllReadMock.mockReset();
});

describe('NotificationBell', () => {
  it('shows no unread badge when there are no unread notifications', () => {
    setNotifications([makeNotification({ isRead: true })]);
    render(<NotificationBell />);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows the unread count badge', () => {
    setNotifications([makeNotification({ id: 'n1', isRead: false }), makeNotification({ id: 'n2', isRead: true })]);
    render(<NotificationBell />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens a dropdown listing notifications on click', () => {
    setNotifications([makeNotification({ metadata: { cardId: 'card-1', cardTitle: 'Ship the release' } })]);
    render(<NotificationBell />);

    expect(screen.queryByText(/Ship the release/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText(/Ship the release/)).toBeInTheDocument();
  });

  it('marks a notification read and navigates to its card on click', () => {
    setNotifications([makeNotification({ id: 'n1', boardId: 'board-9', metadata: { cardId: 'card-9', cardTitle: 'Card 1' } })]);
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(screen.getByText(/mentioned you/));

    expect(markReadMock).toHaveBeenCalledWith('n1');
    expect(navigateMock).toHaveBeenCalledWith('/boards/board-9?card=card-9');
  });

  it('does not re-mark an already-read notification as read on click', () => {
    setNotifications([makeNotification({ id: 'n1', isRead: true })]);
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(screen.getByText(/mentioned you/));

    expect(markReadMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalled();
  });

  it('disables "Mark all read" when nothing is unread', () => {
    setNotifications([makeNotification({ isRead: true })]);
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
  });

  it('calls markAllRead when "Mark all read" is clicked', () => {
    setNotifications([makeNotification({ isRead: false })]);
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    const markAllButton = screen.getByRole('button', { name: 'Mark all read' });
    expect(markAllButton).not.toBeDisabled();
    fireEvent.click(markAllButton);
    expect(markAllReadMock).toHaveBeenCalled();
  });
});
