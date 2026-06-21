import type { PresenceUser } from '@taskflow/shared';
import { Avatar } from '../Avatar';

interface PresenceBarProps {
  users: PresenceUser[];
  isConnected: boolean;
  /** The local user's id, so they can be labelled "(you)" and listed first. */
  currentUserId: string | undefined;
}

const MAX_VISIBLE = 5;

/** Live viewer avatars for a board, with a connection status dot. */
export function PresenceBar({ users, isConnected, currentUserId }: PresenceBarProps): JSX.Element {
  // Show the local user first, then everyone else in a stable order.
  const ordered = [...users].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return a.name.localeCompare(b.name);
  });
  const visible = ordered.slice(0, MAX_VISIBLE);
  const overflow = ordered.length - visible.length;

  return (
    <div className="flex items-center gap-2" aria-label="People viewing this board">
      <span
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129_/_0.18)]' : 'bg-slate-300 dark:bg-slate-600'}`}
        title={isConnected ? 'Live — connected' : 'Reconnecting…'}
        aria-hidden="true"
      />
      <div className="flex items-center -space-x-1.5">
        {visible.map((user) => {
          const label = user.userId === currentUserId ? `${user.name} (you)` : user.name;
          return (
            <span
              key={user.userId}
              title={user.editingCardId ? `${label} — editing a card` : label}
              className={`relative rounded-full ring-2 ${
                user.editingCardId ? 'ring-amber-300' : 'ring-white dark:ring-slate-900'
              }`}
            >
              <Avatar name={user.name} avatarUrl={user.avatarUrl} />
            </span>
          );
        })}
        {overflow > 0 && (
          <span
            title={ordered.slice(MAX_VISIBLE).map((u) => u.name).join(', ')}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 ring-2 ring-white dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-900"
          >
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}
