import { useState, type CSSProperties } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, WorkspaceMemberWithUser } from '@taskflow/shared';
import type { ColumnWithCards } from '../../lib/board/reorder';
import { cardMatchesFilters, hasActiveFilters, type BoardFilters } from '../../lib/board/filters';
import { CardItem } from './CardItem';
import { Badge } from '../ui';
import { GripIcon, PlusIcon, TrashIcon } from '../icons';

interface BoardColumnProps {
  column: ColumnWithCards;
  members: WorkspaceMemberWithUser[];
  filters: BoardFilters;
  editingByCard?: Map<string, string>;
  onRename: (columnId: string, title: string) => void;
  onDelete: (columnId: string) => void;
  onAddCard: (columnId: string) => void;
  onEditCard: (card: Card) => void;
}

export function BoardColumn({
  column,
  members,
  filters,
  editingByCard,
  onRename,
  onDelete,
  onAddCard,
  onEditCard,
}: BoardColumnProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });
  // A dedicated droppable over the card list so a card can be dropped anywhere in
  // the column — crucially including an *empty* column, whose card SortableContext
  // has no items to collide with. Carries columnId so resolveOverColumn lands the
  // card at the end (index === cards.length, i.e. position 0 when empty).
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `col-dropzone:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  function commitTitle(): void {
    const trimmed = titleDraft.trim();
    setIsEditingTitle(false);
    if (trimmed && trimmed !== column.title) {
      onRename(column.id, trimmed);
    } else {
      setTitleDraft(column.title);
    }
  }

  function findAssignee(assigneeId: string | null): WorkspaceMemberWithUser | undefined {
    return assigneeId ? members.find((member) => member.userId === assigneeId) : undefined;
  }

  const filtersActive = hasActiveFilters(filters);
  const matchedCount = filtersActive
    ? column.cards.filter((card) => cardMatchesFilters(card, filters)).length
    : column.cards.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="board-column"
      className="flex max-h-full w-72 flex-shrink-0 flex-col rounded-2xl border border-slate-200/70 bg-slate-100/70 p-3 shadow-soft transition-shadow dark:border-slate-800/70 dark:bg-slate-900/50"
    >
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag column: ${column.title}`}
          className="flex-shrink-0 cursor-grab touch-none rounded p-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:text-slate-500 dark:hover:text-slate-300"
        >
          <GripIcon />
        </button>

        {isEditingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitTitle();
              if (event.key === 'Escape') {
                setTitleDraft(column.title);
                setIsEditingTitle(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-indigo-300 bg-white px-2 py-1 text-sm font-semibold text-slate-700 focus:outline-none dark:border-indigo-500 dark:bg-slate-800 dark:text-slate-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {column.title}
          </button>
        )}

        <Badge mono className="flex-shrink-0">
          {filtersActive ? `${matchedCount}/${column.cards.length}` : column.cards.length}
        </Badge>
        <button
          type="button"
          onClick={() => onDelete(column.id)}
          aria-label={`Delete column: ${column.title}`}
          className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <TrashIcon />
        </button>
      </div>

      <SortableContext items={column.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setDropRef}
          className={`scrollbar-subtle flex min-h-[60px] flex-col gap-2 overflow-y-auto rounded-lg p-0.5 transition-colors duration-150 ${
            isOver
              ? 'bg-indigo-500/10 outline-dashed outline-2 outline-offset-[-2px] outline-indigo-400/60 dark:bg-indigo-500/10'
              : 'outline-2 outline-transparent'
          }`}
        >
          {column.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              assignee={findAssignee(card.assigneeId)}
              editingBy={editingByCard?.get(card.id)}
              isDimmed={filtersActive && !cardMatchesFilters(card, filters)}
              onEdit={() => onEditCard(card)}
            />
          ))}
        </div>
      </SortableContext>

      <button
        type="button"
        onClick={() => onAddCard(column.id)}
        className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-300/50 dark:text-slate-400 dark:hover:bg-slate-700/50"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add card
      </button>
    </div>
  );
}
