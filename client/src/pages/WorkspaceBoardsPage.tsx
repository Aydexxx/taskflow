import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Board, Workspace, WorkspaceMemberWithUser } from '@taskflow/shared';
import { roleAtLeast } from '@taskflow/shared';
import { api, ApiRequestError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { TrashIcon } from '../components/icons';
import { Button, EmptyState, Input, Spinner } from '../components/ui';
import { myRole as deriveMyRole } from '../lib/workspaceRole';

export function WorkspaceBoardsPage(): JSX.Element {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberWithUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
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
      <main className="mx-auto max-w-4xl px-6 py-8">
        {canCreateBoards && (
          <form onSubmit={handleCreate} className="mb-8 flex gap-3">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="New board title"
              aria-label="New board title"
              className="flex-1"
            />
            <Button type="submit" isLoading={isCreating} disabled={!title.trim()}>
              {isCreating ? 'Creating…' : 'Create board'}
            </Button>
          </form>
        )}
        {createError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{createError}</p>}

        {boards === null && !loadError && (
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Spinner className="h-4 w-4" />
            Loading boards…
          </div>
        )}
        {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
        {boards !== null && boards.length === 0 && (
          <EmptyState title="No boards yet" description="Create your first board above to start planning work." />
        )}

        <ul className="grid gap-4 sm:grid-cols-2">
          {boards?.map((board) => (
            <li key={board.id} className="group relative">
              <Link
                to={`/boards/${board.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ring-1 ring-slate-900/[0.02] transition duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:ring-0 dark:hover:border-indigo-500/50"
              >
                <h2 className="pr-6 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{board.title}</h2>
                {board.description && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{board.description}</p>
                )}
              </Link>
              {canDeleteBoards && (
                <button
                  type="button"
                  onClick={() => handleDelete(board)}
                  aria-label={`Delete ${board.title}`}
                  className="absolute right-3 top-3 rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
