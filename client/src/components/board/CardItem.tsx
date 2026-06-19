import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, WorkspaceMemberWithUser } from '@taskflow/shared';
import { Avatar } from '../Avatar';
import { GripIcon } from '../icons';
import { labelChipClass } from '../../lib/board/labelColors';
import { PRIORITY_BADGE_CLASS, PRIORITY_LABELS } from '../../lib/board/priority';

interface CardItemProps {
  card: Card;
  assignee?: WorkspaceMemberWithUser;
  /** Name of another collaborator currently editing this card, if any. */
  editingBy?: string;
  /** True when an active board filter excludes this card; dimmed but still fully interactive. */
  isDimmed?: boolean;
  onEdit: () => void;
}

export function CardItem({ card, assignee, editingBy, isDimmed = false, onEdit }: CardItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.columnId },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : isDimmed ? 0.35 : 1,
  };

  const isOverdue = card.dueDate ? new Date(card.dueDate).getTime() < Date.now() : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="card-item"
      className={`flex items-start gap-1 rounded-lg border bg-white p-2 shadow-sm transition hover:shadow dark:bg-slate-800 ${
        editingBy
          ? 'border-amber-300 ring-1 ring-amber-300 dark:border-amber-500/50 dark:ring-amber-500/40'
          : 'border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-500/60'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag card: ${card.title}`}
        className="mt-1 flex-shrink-0 cursor-grab touch-none rounded p-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
      >
        <GripIcon />
      </button>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{card.title}</p>
        {editingBy && (
          <p className="mt-0.5 truncate text-[11px] font-medium text-amber-600 dark:text-amber-400">
            ✎ {editingBy} editing…
          </p>
        )}
        {card.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{card.description}</p>
        )}
        {card.labels.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {card.labels.map((label) => (
              <span
                key={label.id}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${labelChipClass(label.color)}`}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          {card.priority !== 'MEDIUM' && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE_CLASS[card.priority]}`}>
              {PRIORITY_LABELS[card.priority]}
            </span>
          )}
          {card.dueDate && (
            <span
              className={`text-xs ${isOverdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
              {new Date(card.dueDate).toLocaleDateString()}
            </span>
          )}
          <span className="flex-1" />
          {assignee && <Avatar name={assignee.user.name} />}
        </div>
      </button>
    </div>
  );
}
