import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Card, WorkspaceMemberWithUser } from '@taskflow/shared';
import { type ColumnWithCards, moveCard, reorderColumns, resolveOverColumn } from '../../lib/board/reorder';
import { EMPTY_FILTERS, type BoardFilters } from '../../lib/board/filters';
import { BoardColumn } from './BoardColumn';
import { CardItem } from './CardItem';
import { CardModal, type CardFormValues } from './CardModal';
import { ApiRequestError } from '../../lib/api';
import { PlusIcon } from '../icons';
import { Button } from '../ui';

type CardModalState = { mode: 'create'; columnId: string } | { mode: 'edit'; cardId: string };

interface KanbanBoardProps {
  columns: ColumnWithCards[];
  members: WorkspaceMemberWithUser[];
  workspaceId: string;
  /** Active board search/filter state; defaults to "no filters" so callers that don't filter are unaffected. */
  filters?: BoardFilters;
  /** Open this card's edit modal once it's present in `columns` (e.g. arriving from a notification's `?card=` link). */
  openCardId?: string;
  /** Called once `openCardId` has been consumed, so the caller can clear it (e.g. from the URL). */
  onOpenCardHandled?: () => void;
  /** cardId -> name of another collaborator currently editing that card. */
  editingByCard?: Map<string, string>;
  /** Announce which card the local user is editing (null when they stop). */
  onEditingChange?: (cardId: string | null) => void;
  onColumnsChange: (columns: ColumnWithCards[]) => void;
  onColumnMoved: (columnId: string, toIndex: number, previousColumns: ColumnWithCards[]) => void;
  onCardMoved: (cardId: string, toColumnId: string, toIndex: number, previousColumns: ColumnWithCards[]) => void;
  onCreateColumn: (title: string) => Promise<void>;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onCreateCard: (columnId: string, values: CardFormValues) => Promise<void>;
  onUpdateCard: (cardId: string, values: CardFormValues) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  /** Called after a label add/remove so the board's local card list updates immediately. */
  onCardUpdated: (card: Card) => void;
}

export function KanbanBoard({
  columns,
  members,
  workspaceId,
  filters = EMPTY_FILTERS,
  openCardId,
  onOpenCardHandled,
  editingByCard,
  onEditingChange,
  onColumnsChange,
  onColumnMoved,
  onCardMoved,
  onCreateColumn,
  onRenameColumn,
  onDeleteColumn,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onCardUpdated,
}: KanbanBoardProps): JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'column' | 'card' | null>(null);
  const dragStartSnapshotRef = useRef<ColumnWithCards[] | null>(null);

  const [cardModalState, setCardModalState] = useState<CardModalState | null>(null);

  // Re-derived from the live `columns` prop (rather than a snapshot taken at open
  // time) so label/priority/assignee changes — local or broadcast from another
  // collaborator — show up in the open modal immediately.
  const openCard =
    cardModalState?.mode === 'edit'
      ? columns.flatMap((column) => column.cards).find((card) => card.id === cardModalState.cardId) ?? null
      : null;

  // If the open card is deleted (locally or by another collaborator), close the modal.
  useEffect(() => {
    if (cardModalState?.mode === 'edit' && !openCard) setCardModalState(null);
  }, [cardModalState, openCard]);

  // Arriving from a notification's `?card=` link: open that card as soon as
  // it shows up in `columns` (it may still be loading on first render).
  useEffect(() => {
    if (!openCardId) return;
    const exists = columns.some((column) => column.cards.some((card) => card.id === openCardId));
    if (!exists) return;
    setCardModalState({ mode: 'edit', cardId: openCardId });
    onOpenCardHandled?.();
  }, [openCardId, columns, onOpenCardHandled]);

  // Broadcast which card the local user is editing while the edit modal is open.
  useEffect(() => {
    if (!onEditingChange) return undefined;
    onEditingChange(cardModalState?.mode === 'edit' ? cardModalState.cardId : null);
    return () => onEditingChange(null);
  }, [cardModalState, onEditingChange]);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [createColumnError, setCreateColumnError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent): void {
    dragStartSnapshotRef.current = columns;
    setActiveId(event.active.id as string);
    setActiveType((event.active.data.current?.type as 'card' | 'column' | undefined) ?? null);
  }

  function handleDragOver(event: DragOverEvent): void {
    const { active, over } = event;
    if (!over || active.data.current?.type !== 'card') return;

    const cardId = active.id as string;
    const sourceColumn = columns.find((column) => column.cards.some((card) => card.id === cardId));
    const destination = resolveOverColumn(over, columns);
    if (!sourceColumn || !destination || sourceColumn.id === destination.columnId) return;

    onColumnsChange(moveCard(columns, cardId, destination.columnId, destination.index));
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    const previousColumns = dragStartSnapshotRef.current ?? columns;
    dragStartSnapshotRef.current = null;
    if (!over) return;

    if (active.data.current?.type === 'column') {
      const fromIndex = columns.findIndex((column) => column.id === active.id);
      // resolveOverColumn handles every over target (a column's sortable node, its
      // card-list dropzone, or a card) and returns the underlying columnId — the
      // dropzone's raw `over.id` is namespaced, so don't read it directly.
      const overColumnId = resolveOverColumn(over, columns)?.columnId;
      const toIndex = overColumnId ? columns.findIndex((column) => column.id === overColumnId) : -1;
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      onColumnsChange(reorderColumns(columns, fromIndex, toIndex));
      onColumnMoved(active.id as string, toIndex, previousColumns);
      return;
    }

    if (active.data.current?.type === 'card') {
      const cardId = active.id as string;
      const destination = resolveOverColumn(over, columns);
      if (!destination) return;

      const next = moveCard(columns, cardId, destination.columnId, destination.index);
      onColumnsChange(next);
      const finalColumn = next.find((column) => column.id === destination.columnId);
      const finalIndex = finalColumn ? finalColumn.cards.findIndex((card) => card.id === cardId) : destination.index;
      onCardMoved(cardId, destination.columnId, finalIndex, previousColumns);
    }
  }

  async function handleAddColumn(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;

    setIsCreatingColumn(true);
    setCreateColumnError(null);
    try {
      await onCreateColumn(trimmed);
      setNewColumnTitle('');
      setIsAddingColumn(false);
    } catch (error) {
      setCreateColumnError(error instanceof ApiRequestError ? error.message : 'Failed to create column');
    } finally {
      setIsCreatingColumn(false);
    }
  }

  const activeCard =
    activeType === 'card' ? columns.flatMap((column) => column.cards).find((card) => card.id === activeId) : null;
  const activeColumn = activeType === 'column' ? columns.find((column) => column.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="scrollbar-subtle flex h-full gap-4 overflow-x-auto p-6">
        <SortableContext items={columns.map((column) => column.id)} strategy={horizontalListSortingStrategy}>
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              members={members}
              filters={filters}
              editingByCard={editingByCard}
              onRename={onRenameColumn}
              onDelete={onDeleteColumn}
              onAddCard={(columnId) => setCardModalState({ mode: 'create', columnId })}
              onEditCard={(card) => setCardModalState({ mode: 'edit', cardId: card.id })}
            />
          ))}
        </SortableContext>

        <div className="w-72 flex-shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={handleAddColumn}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-slate-100/70 p-3 shadow-soft dark:border-slate-800/70 dark:bg-slate-900/50"
            >
              <input
                autoFocus
                value={newColumnTitle}
                onChange={(event) => setNewColumnTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setIsAddingColumn(false);
                    setNewColumnTitle('');
                    setCreateColumnError(null);
                  }
                }}
                placeholder="Column title"
                aria-label="New column title"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-soft transition duration-150 ease-out-soft focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/25"
              />
              {createColumnError && <p className="text-xs text-red-600 dark:text-red-400">{createColumnError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" isLoading={isCreatingColumn} disabled={!newColumnTitle.trim()}>
                  {isCreatingColumn ? 'Adding…' : 'Add column'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnTitle('');
                    setCreateColumnError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="flex w-full items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-slate-100/40 px-3 py-2.5 text-sm font-medium text-slate-500 transition duration-150 ease-out-soft hover:border-indigo-300 hover:bg-white hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/60 dark:hover:text-indigo-300"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {columns.length === 0 ? 'Add your first column' : 'Add column'}
            </button>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {activeCard && (
          // Lift the dragged card off the board: a slight tilt + scale and a deep,
          // soft shadow signal "picked up" without obscuring the drop target.
          <div className="rotate-2 scale-[1.03] cursor-grabbing rounded-xl shadow-overlay ring-1 ring-indigo-400/40">
            <CardItem
              card={activeCard}
              assignee={members.find((member) => member.userId === activeCard.assigneeId)}
              onEdit={() => {}}
            />
          </div>
        )}
        {activeColumn && (
          <div className="w-72 rotate-1 scale-[1.02] rounded-2xl border border-slate-200 bg-slate-100/95 p-3 shadow-overlay ring-1 ring-indigo-400/30 dark:border-slate-800 dark:bg-slate-900/95">
            <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{activeColumn.title}</p>
          </div>
        )}
      </DragOverlay>

      {cardModalState && (cardModalState.mode === 'create' || openCard) && (
        <CardModal
          card={cardModalState.mode === 'edit' ? openCard : null}
          members={members}
          workspaceId={workspaceId}
          onClose={() => setCardModalState(null)}
          onSubmit={(values) =>
            cardModalState.mode === 'create'
              ? onCreateCard(cardModalState.columnId, values)
              : onUpdateCard(cardModalState.cardId, values)
          }
          onDelete={cardModalState.mode === 'edit' ? () => onDeleteCard(cardModalState.cardId) : undefined}
          onCardUpdated={onCardUpdated}
        />
      )}
    </DndContext>
  );
}
