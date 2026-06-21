import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationWithActor } from '@taskflow/shared';
import { useNotifications } from '../hooks/useNotifications';
import { describeNotification } from '../lib/notifications';
import { BellIcon } from './icons';
import { Avatar } from './Avatar';

/** Header bell with an unread badge and a dropdown of recent notifications. */
export function NotificationBell(): JSX.Element {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function handleSelect(notification: NotificationWithActor): void {
    setOpen(false);
    if (!notification.isRead) void markRead(notification.id);
    navigate(`/boards/${notification.boardId}?card=${notification.metadata.cardId}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition duration-150 ease-out-soft hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-overlay ring-1 ring-slate-900/5 animate-slide-in-down dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 dark:border-slate-700/80">
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Notifications</span>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="text-xs font-medium text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline dark:text-indigo-400 dark:disabled:text-slate-600"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                No notifications yet.
              </li>
            )}
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(notification)}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                    notification.isRead ? '' : 'bg-indigo-50/60 dark:bg-indigo-500/10'
                  }`}
                >
                  <Avatar name={notification.actor.name} avatarUrl={notification.actor.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-slate-700 dark:text-slate-200">
                      {describeNotification(notification)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </span>
                  {!notification.isRead && (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
