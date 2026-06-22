import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Board, Workspace, WorkspaceMemberWithUser } from '@taskflow/shared';
import { roleAtLeast } from '@taskflow/shared';
import { ArrowUpRight, Columns3, LayoutGrid, Plus, SquareKanban, Users } from 'lucide-react';
import { api, ApiRequestError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { AppPage } from '../components/AppPage';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { TrashIcon } from '../components/icons';
import { Badge, Button, EmptyState, Input, Spinner } from '../components/ui';
import { formatRelativeTime } from '../lib/time';
import { myRole as deriveMyRole } from '../lib/workspaceRole';

/** Best-effort per-board tallies, loaded after the list so cards stay rich. */
interface BoardCounts {
  columns: number;
  cards: number;
}

/** Stacked, overlapping member avatars with an overflow chip. */
function MemberStack({ members }: { members: WorkspaceMemberWithUser[] }): JSX.Element | null {
  if (members.length === 0) return null;
  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((member) => (
          <Avatar
            key={member.id}
            name={member.user.name}
            avatarUrl={member.user.avatarUrl}
            className="h-7 w-7 !text-[11px] ring-2 ring-white dark:ring-slate-950"
          />
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">+{extra}</span>
      )}
    </div>
  );
}

export function WorkspaceBoardsPage(): JSX.Element {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberWithUser[]>([]);
  const [counts, setCounts] = useState<Record<string, BoardCounts>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const myRoleValue = useMemo(() => deriveMyRole(members, user?.id), [members, user?.id]);
  const canCreateBoards = myRoleValue !== null && roleAtLeast(myRoleValue, 'MEMBER');
  const canDeleteBoards = myRoleValue !== null && roleAtLeast(myRoleValue, 'ADMIN');

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    Promise.all([
      api.workspaces.get(workspaceId),
      api.boards.listForWorkspace(workspaceId),
      api.workspaces.listMembers(workspaceId),
    ])
      .then(([loadedWorkspace, loadedBoards, loadedMembers]) => {
        if (cancelled) return;
        setWorkspace(loadedWorkspace);
        setBoards(loadedBoards);
        setMembers(loadedMembers);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof ApiRequestError ? error.message : 'Failed to load boards');
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Enrich each board with column/card tallies. Best-effort and non-blocking: a
  // card shows immediately and fills in counts as they arrive; failures are silent.
  useEffect(() => {
    if (!boards || boards.length === 0) return;
    let cancelled = false;
    for (const board of boards) {
      if (counts[board.id]) continue;
      api.boards
        .get(board.id)
        .then((full) => {
          if (cancelled) return;
          const cards = full.columns.reduce((sum, column) => sum + column.cards.length, 0);
          setCounts((prev) => ({ ...prev, [board.id]: { columns: full.columns.length, cards } }));
        })
        .catch(() => {
          /* tallies are decorative; ignore failures */
        });
    }
    return () => {
      cancelled = true;
    };
    // `counts` is intentionally omitted: we guard per-id above and only want this
    // to run when the board list itself changes.
  }, [boards]);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = title.trim();
    if (!workspaceId || !trimmed) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      const board = await api.boards.createForWorkspace(workspaceId, { title: trimmed });
      setBoards((prev) => [...(prev ?? []), board]);
      setTitle('');
    } catch (error) {
      setCreateError(error instanceof ApiRequestError ? error.message : 'Failed to create board');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(board: Board): Promise<void> {
    if (!window.confirm(`Delete "${board.title}"? This cannot be undone.`)) return;
    try {
      await api.boards.delete(board.id);
      setBoards((prev) => prev?.filter((b) => b.id !== board.id) ?? null);
    } catch (error) {
      setLoadError(error instanceof ApiRequestError ? error.message : 'Failed to delete board');
    }
  }

  const hasBoards = boards !== null && boards.length > 0;

  return (
    <AppPage
      header={
        <AppHeader
          title={workspace?.name ?? 'Boards'}
          backTo={{ to: '/app', label: 'Workspaces' }}
          actions={
            workspaceId && (
              <Link
                to={`/workspaces/${workspaceId}/members`}
                className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Members
              </Link>
            )
          }
        />
      }
    >
      <PageHeader
        eyebrow={
          hasBoards ? (
            <Badge tone="accent" mono>
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </Badge>
          ) : undefined
        }
        title={workspace?.name ?? 'Boards'}
        subtitle="Every board is a live, drag-and-drop space for planning work. Open one to pick up where the team left off."
        actions={
          <>
            {members.length > 0 && (
              <Link
                to={workspaceId ? `/workspaces/${workspaceId}/members` : '#'}
                className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 py-1 pl-2 pr-3 shadow-soft transition hover:border-indigo-200 hover:shadow sm:flex dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-500/40"
                aria-label="View members"
              >
                <MemberStack members={members} />
              </Link>
            )}
            {canCreateBoards && (
              <Button type="button" onClick={() => titleInputRef.current?.focus()}>
                <Plus className="h-4 w-4" />
                New board
              </Button>
            )}
          </>
        }
      />

      {canCreateBoards && (
        <form
          onSubmit={handleCreate}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-soft ring-1 ring-slate-900/[0.02] backdrop-blur-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/60 dark:ring-0"
        >
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Name a new board…"
            aria-label="New board title"
            className="flex-1"
          />
          <Button type="submit" isLoading={isCreating} disabled={!title.trim()}>
            {isCreating ? 'Creating…' : 'Create board'}
          </Button>
        </form>
      )}
      {createError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{createError}</p>}

      {boards === null && !loadError && (
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
          <Spinner className="h-4 w-4" />
          Loading boards…
        </div>
      )}
      {loadError && <p className="mt-8 text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      {boards !== null && boards.length === 0 && (
        <EmptyState
          className="mt-8"
          icon={<SquareKanban className="h-5 w-5" />}
          title="No boards yet"
          description={
            canCreateBoards
              ? 'Create your first board to start planning work with columns, cards, and your team.'
              : 'No boards have been created in this workspace yet.'
          }
          action={
            canCreateBoards ? (
              <Button type="button" onClick={() => titleInputRef.current?.focus()}>
                <Plus className="h-4 w-4" />
                Create a board
              </Button>
            ) : undefined
          }
        />
      )}

      {hasBoards && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => {
            const count = counts[board.id];
            return (
              <li key={board.id} className="group relative">
                <Link
                  to={`/boards/${board.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft ring-1 ring-slate-900/[0.02] transition duration-200 ease-out-soft hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:ring-0 dark:hover:border-indigo-500/40"
                >
                  {/* Accent header strip — the landing's gradient motif, as a board lid */}
                  <div className="relative h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25"
                      >
                        <LayoutGrid className="h-5 w-5" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition duration-200 ease-out-soft group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600" />
                    </div>

                    <h2 className="mt-4 truncate pr-6 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      {board.title}
                    </h2>
                    {board.description ? (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {board.description}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm italic text-slate-400 dark:text-slate-500">No description</p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {count ? count.columns : '—'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {count ? count.cards : '—'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(board.updatedAt)}
                      </span>
                    </div>
                  </div>
                </Link>
                {canDeleteBoards && (
                  <button
                    type="button"
                    onClick={() => handleDelete(board)}
                    aria-label={`Delete ${board.title}`}
                    className="absolute right-3 top-5 rounded-md p-1 text-white/80 opacity-0 transition hover:bg-white/20 hover:text-white focus:opacity-100 group-hover:opacity-100"
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppPage>
  );
}
