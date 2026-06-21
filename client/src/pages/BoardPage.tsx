import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { ActivityCreatedEvent, ActivityWithActor, Card, Label, WorkspaceMemberWithUser } from '@taskflow/shared';
import { api, ApiRequestError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { PresenceBar } from '../components/board/PresenceBar';
import { ActivityFeed } from '../components/board/ActivityFeed';
import { FilterBar } from '../components/board/FilterBar';
import { ActivityIcon } from '../components/icons';
import { IconButton } from '../components/ui';
import type { CardFormValues } from '../components/board/CardModal';
import type { ColumnWithCards } from '../lib/board/reorder';
import { applyCardUpsert, applyColumnUpsert, normalizeBoardColumns } from '../lib/board/boardEvents';
import { cardMatchesFilters, filtersFromSearchParams, filtersToSearchParams } from '../lib/board/filters';
import { deleteSavedView, listSavedViews, saveView, type SavedView } from '../lib/board/savedViews';
import { useBoardRealtime } from '../hooks/useBoardRealtime';

export function BoardPage(): JSX.Element {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuth();
  const [boardTitle, setBoardTitle] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnWithCards[] | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberWithUser[]>([]);
  const [workspaceLabels, setWorkspaceLabels] = useState<Label[]>([]);
  const [activity, setActivity] = useState<ActivityWithActor[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // The URL query string is the source of truth for filter state, so a filtered
  // board view is shareable/bookmarkable by copying the address bar.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const handleFiltersChange = useCallback(
    (next: typeof filters) => {
      setSearchParams((current) => filtersToSearchParams(next, current), { replace: true });
    },
    [setSearchParams],
  );

  // A notification's "click navigates to the relevant card" link arrives as
  // `?card=<id>`; once KanbanBoard has opened it, drop the param so a reload
  // doesn't keep reopening it.
  const openCardId = searchParams.get('card') ?? undefined;
  const handleOpenCardHandled = useCallback(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('card');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    api.boards
      .get(boardId)
      .then(async (board) => {
        if (cancelled) return;
        setBoardTitle(board.title);
        setWorkspaceId(board.workspaceId);
        setColumns(normalizeBoardColumns(board.columns));
        const [memberList, activityList, labelList] = await Promise.all([
          api.workspaces.listMembers(board.workspaceId),
          api.boards.listActivity(boardId),
          api.workspaces.listLabels(board.workspaceId),
        ]);
        if (cancelled) return;
        setMembers(memberList);
        setActivity(activityList);
        setWorkspaceLabels(labelList);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof ApiRequestError ? error.message : 'Failed to load board');
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    setSavedViews(listSavedViews(boardId));
  }, [boardId]);

  const handleSaveView = useCallback(
    (name: string) => {
      if (!boardId) return;
      setSavedViews(saveView(boardId, name, filters));
    },
    [boardId, filters],
  );

  const handleApplyView = useCallback(
    (view: SavedView) => {
      handleFiltersChange(view.filters);
    },
    [handleFiltersChange],
  );

  const handleDeleteView = useCallback(
    (viewId: string) => {
      if (!boardId) return;
      setSavedViews(deleteSavedView(boardId, viewId));
    },
    [boardId],
  );

  // Apply a remote board mutation to local state (ignored before the board loads).
  const applyEvent = useCallback((reducer: (cols: ColumnWithCards[]) => ColumnWithCards[]) => {
    setColumns((current) => (current ? reducer(current) : current));
  }, []);

  // After a reconnect, refetch authoritative board state to recover missed events.
  const resync = useCallback(() => {
    if (!boardId) return;
    api.boards
      .get(boardId)
      .then((board) => setColumns(normalizeBoardColumns(board.columns)))
      .catch(() => {
        /* transient; the next event or manual refresh will reconcile */
      });
  }, [boardId]);

  const onActivityCreated = useCallback((event: ActivityCreatedEvent) => {
    // Dedupe by id: the originating client also receives its own broadcast, and a
    // reconnect can replay a just-seen entry — applying the same event twice is a no-op.
    setActivity((current) =>
      current.some((entry) => entry.id === event.activity.id) ? current : [event.activity, ...current],
    );
  }, []);

  const { presence, isConnected, announceEditing } = useBoardRealtime({
    boardId,
    applyEvent,
    resync,
    onActivityCreated,
  });

  const handleCardUpdated = useCallback((card: Card) => {
    setColumns((current) => (current ? applyCardUpsert(current, card) : current));
  }, []);

  // Map of cardId -> name of another user currently editing it (excludes self).
  const editingByCard = useMemo(() => {
    const map = new Map<string, string>();
    for (const viewer of presence) {
      if (viewer.editingCardId && viewer.userId !== user?.id) {
        map.set(viewer.editingCardId, viewer.name);
      }
    }
    return map;
  }, [presence, user?.id]);

  const handleColumnsChange = useCallback((next: ColumnWithCards[]) => {
    setColumns(next);
  }, []);

  async function handleColumnMoved(
    columnId: string,
    toIndex: number,
    previousColumns: ColumnWithCards[],
  ): Promise<void> {
    try {
      const updated = await api.columns.update(columnId, { index: toIndex });
      setColumns(
        (current) => current?.map((column) => (column.id === columnId ? { ...column, ...updated } : column)) ?? current,
      );
    } catch (error) {
      setColumns(previousColumns);
      setMutationError(error instanceof ApiRequestError ? error.message : 'Failed to move column');
    }
  }

  async function handleCardMoved(
    cardId: string,
    toColumnId: string,
    toIndex: number,
    previousColumns: ColumnWithCards[],
  ): Promise<void> {
    try {
      const updated = await api.cards.move(cardId, { columnId: toColumnId, index: toIndex });
      setColumns(
        (current) =>
          current?.map((column) =>
            column.id === toColumnId
              ? { ...column, cards: column.cards.map((card) => (card.id === cardId ? { ...card, ...updated } : card)) }
              : column,
          ) ?? current,
      );
    } catch (error) {
      setColumns(previousColumns);
      setMutationError(error instanceof ApiRequestError ? error.message : 'Failed to move card');
    }
  }

  async function handleCreateColumn(title: string): Promise<void> {
    if (!boardId) throw new Error('Missing board id');
    const column = await api.columns.createForBoard(boardId, { title });
    // Upsert by id (not append): the server also broadcasts column:created back to
    // us, and that echo can arrive before this response — deduping avoids a double.
    setColumns((current) => applyColumnUpsert(current ?? [], column));
  }

  function handleRenameColumn(columnId: string, title: string): void {
    const previous = columns;
    setColumns((current) => current?.map((column) => (column.id === columnId ? { ...column, title } : column)) ?? current);
    api.columns.update(columnId, { title }).catch((error: unknown) => {
      setColumns(previous);
      setMutationError(error instanceof ApiRequestError ? error.message : 'Failed to rename column');
    });
  }

  function handleDeleteColumn(columnId: string): void {
    if (!window.confirm('Delete this column and all its cards? This cannot be undone.')) return;
    const previous = columns;
    setColumns((current) => current?.filter((column) => column.id !== columnId) ?? current);
    api.columns.delete(columnId).catch((error: unknown) => {
      setColumns(previous);
      setMutationError(error instanceof ApiRequestError ? error.message : 'Failed to delete column');
    });
  }

  async function handleCreateCard(columnId: string, values: CardFormValues): Promise<void> {
    const card = await api.cards.createForColumn(columnId, {
      title: values.title,
      priority: values.priority,
      ...(values.description ? { description: values.description } : {}),
      ...(values.assigneeId ? { assigneeId: values.assigneeId } : {}),
      ...(values.dueDate ? { dueDate: new Date(values.dueDate).toISOString() } : {}),
    });
    // Upsert by id (not append): the card:created broadcast echoes back to us and
    // may land before this response — deduping avoids the card appearing twice.
    setColumns((current) => (current ? applyCardUpsert(current, card) : current));
  }

  async function handleUpdateCard(cardId: string, values: CardFormValues): Promise<void> {
    const updated = await api.cards.update(cardId, {
      title: values.title,
      description: values.description || null,
      assigneeId: values.assigneeId || null,
      priority: values.priority,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
    });
    setColumns((current) => (current ? applyCardUpsert(current, updated) : current));
  }

  const totalCardCount = useMemo(
    () => columns?.reduce((sum, column) => sum + column.cards.length, 0) ?? 0,
    [columns],
  );
  const matchedCardCount = useMemo(
    () =>
      columns?.reduce(
        (sum, column) => sum + column.cards.filter((card) => cardMatchesFilters(card, filters)).length,
        0,
      ) ?? 0,
    [columns, filters],
  );

  async function handleDeleteCard(cardId: string): Promise<void> {
    await api.cards.delete(cardId);
    setColumns(
      (current) =>
        current?.map((column) => ({ ...column, cards: column.cards.filter((card) => card.id !== cardId) })) ?? current,
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <AppHeader
        title={boardTitle ?? 'Board'}
        backTo={workspaceId ? { to: `/workspaces/${workspaceId}`, label: 'Boards' } : undefined}
        actions={
          <>
            <PresenceBar users={presence} isConnected={isConnected} currentUserId={user?.id} />
            <IconButton
              onClick={() => setShowActivity((current) => !current)}
              aria-label="Toggle activity feed"
              aria-pressed={showActivity}
              active={showActivity}
            >
              <ActivityIcon className="h-4 w-4" />
            </IconButton>
          </>
        }
      />
      {mutationError && (
        <div className="flex items-center justify-between bg-red-50 px-6 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <span>{mutationError}</span>
          <button type="button" onClick={() => setMutationError(null)} className="font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}
      {columns !== null && workspaceId !== null && (
        <FilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          members={members}
          labels={workspaceLabels}
          matchedCount={matchedCardCount}
          totalCount={totalCardCount}
          savedViews={savedViews}
          onSaveView={handleSaveView}
          onApplyView={handleApplyView}
          onDeleteView={handleDeleteView}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {columns === null && !loadError && (
            <p className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading board…</p>
          )}
          {loadError && <p className="p-6 text-sm text-red-600 dark:text-red-400">{loadError}</p>}
          {columns !== null && workspaceId !== null && (
            <KanbanBoard
              columns={columns}
              members={members}
              workspaceId={workspaceId}
              filters={filters}
              openCardId={openCardId}
              onOpenCardHandled={handleOpenCardHandled}
              editingByCard={editingByCard}
              onEditingChange={announceEditing}
              onColumnsChange={handleColumnsChange}
              onColumnMoved={handleColumnMoved}
              onCardMoved={handleCardMoved}
              onCreateColumn={handleCreateColumn}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              onCreateCard={handleCreateCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onCardUpdated={handleCardUpdated}
            />
          )}
        </div>
        {showActivity && <ActivityFeed activity={activity} onClose={() => setShowActivity(false)} />}
      </div>
    </div>
  );
}
