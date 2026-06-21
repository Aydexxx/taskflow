import { useMemo, useState } from 'react';
import { ACTIVITY_TYPES, type ActivityType, type ActivityWithActor } from '@taskflow/shared';
import { XIcon } from '../icons';
import { Select } from '../ui';

interface ActivityFeedProps {
  activity: ActivityWithActor[];
  onClose: () => void;
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  card_created: 'Card created',
  card_deleted: 'Card deleted',
  card_moved: 'Card moved',
  card_assigned: 'Card assigned',
  card_unassigned: 'Card unassigned',
  card_label_added: 'Label added',
  card_label_removed: 'Label removed',
  card_commented: 'Commented',
  column_created: 'Column created',
  column_deleted: 'Column deleted',
};

function describeActivity(entry: ActivityWithActor): string {
  const actor = entry.actor.name;
  const { metadata } = entry;
  switch (entry.type) {
    case 'card_created':
      return `${actor} created "${metadata.cardTitle}"`;
    case 'card_deleted':
      return `${actor} deleted "${metadata.cardTitle}"`;
    case 'card_moved':
      return `${actor} moved "${metadata.cardTitle}" from ${metadata.fromColumnTitle} to ${metadata.toColumnTitle}`;
    case 'card_assigned':
      return `${actor} assigned "${metadata.cardTitle}" to ${metadata.assigneeName}`;
    case 'card_unassigned':
      return `${actor} unassigned "${metadata.cardTitle}"`;
    case 'card_label_added':
      return `${actor} added the "${metadata.labelName}" label to "${metadata.cardTitle}"`;
    case 'card_label_removed':
      return `${actor} removed the "${metadata.labelName}" label from "${metadata.cardTitle}"`;
    case 'card_commented':
      return `${actor} commented on "${metadata.cardTitle}": "${metadata.commentExcerpt}"`;
    case 'column_created':
      return `${actor} created the "${metadata.columnTitle}" column`;
    case 'column_deleted':
      return `${actor} deleted the "${metadata.columnTitle}" column`;
    default:
      return `${actor} updated the board`;
  }
}

/** Per-board feed of key actions, newest first, with absolute timestamps and a type filter. */
export function ActivityFeed({ activity, onClose }: ActivityFeedProps): JSX.Element {
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const filtered = useMemo(
    () => (typeFilter === 'all' ? activity : activity.filter((entry) => entry.type === typeFilter)),
    [activity, typeFilter],
  );

  return (
    <aside className="flex h-full w-80 flex-shrink-0 flex-col border-l border-slate-200 bg-white animate-slide-in-right dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Activity</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close activity feed"
          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as ActivityType | 'all')}
          aria-label="Filter activity by type"
          className="py-1 text-xs"
        >
          <option value="all">All activity</option>
          {ACTIVITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACTIVITY_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {activity.length === 0 ? 'No activity yet.' : 'No activity matches this filter.'}
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <li key={entry.id} className="text-sm">
              <p className="text-slate-700 dark:text-slate-300">{describeActivity(entry)}</p>
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
