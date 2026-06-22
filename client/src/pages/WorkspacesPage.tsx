import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Workspace } from '@taskflow/shared';
import { ArrowUpRight, LayoutGrid, Plus, Users } from 'lucide-react';
import { api, ApiRequestError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { AppPage } from '../components/AppPage';
import { PageHeader } from '../components/PageHeader';
import { Badge, Button, EmptyState, Input, Spinner } from '../components/ui';
import { formatRelativeTime } from '../lib/time';

/** Best-effort per-workspace tallies, loaded after the list so cards stay rich. */
interface WorkspaceCounts {
  boards: number;
  members: number;
}

function workspaceInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'W';
}

export function WorkspacesPage(): JSX.Element {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [counts, setCounts] = useState<Record<string, WorkspaceCounts>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    api.workspaces
      .list()
      .then((result) => {
        if (!cancelled) setWorkspaces(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof ApiRequestError ? error.message : 'Failed to load workspaces');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Enrich the cards with board/member tallies once the list is in. Best-effort
  // and non-blocking: a card renders immediately and fills in counts as they land,
  // and a failed tally simply leaves that card's counts hidden.
  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    let cancelled = false;
    for (const workspace of workspaces) {
      if (counts[workspace.id]) continue;
      Promise.all([
        api.boards.listForWorkspace(workspace.id),
        api.workspaces.listMembers(workspace.id),
      ])
        .then(([boards, members]) => {
          if (cancelled) return;
          setCounts((prev) => ({ ...prev, [workspace.id]: { boards: boards.length, members: members.length } }));
        })
        .catch(() => {
          /* tallies are decorative; ignore failures */
        });
    }
    return () => {
      cancelled = true;
    };
    // `counts` is intentionally omitted: we guard per-id above and only want this
    // to run when the workspace list itself changes.
  }, [workspaces]);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      const workspace = await api.workspaces.create({ name: trimmed });
      setWorkspaces((prev) => [...(prev ?? []), workspace]);
      setName('');
    } catch (error) {
      setCreateError(error instanceof ApiRequestError ? error.message : 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  }

  const hasWorkspaces = workspaces !== null && workspaces.length > 0;

  return (
    <AppPage header={<AppHeader title="Workspaces" />}>
      <PageHeader
        eyebrow={
          hasWorkspaces ? (
            <Badge tone="accent" mono>
              {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
            </Badge>
          ) : undefined
        }
        title="Your workspaces"
        subtitle="Each workspace is a home for your team's boards, members, and activity. Open one to plan work, or spin up a new space."
        actions={
          hasWorkspaces ? (
            <Button type="button" onClick={() => nameInputRef.current?.focus()}>
              <Plus className="h-4 w-4" />
              New workspace
            </Button>
          ) : undefined
        }
      />

      {/* Create affordance */}
      <form
        onSubmit={handleCreate}
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-soft ring-1 ring-slate-900/[0.02] backdrop-blur-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/60 dark:ring-0"
      >
        <Input
          ref={nameInputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name a new workspace…"
          aria-label="New workspace name"
          className="flex-1"
        />
        <Button type="submit" isLoading={isCreating} disabled={!name.trim()}>
          {isCreating ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
      {createError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{createError}</p>}

      {/* States */}
      {workspaces === null && !loadError && (
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
          <Spinner className="h-4 w-4" />
          Loading workspaces…
        </div>
      )}
      {loadError && <p className="mt-8 text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      {workspaces !== null && workspaces.length === 0 && (
        <EmptyState
          className="mt-8"
          icon={<LayoutGrid className="h-5 w-5" />}
          title="No workspaces yet"
          description="Create your first workspace to start organizing boards, inviting your team, and moving work together."
          action={
            <Button type="button" onClick={() => nameInputRef.current?.focus()}>
              <Plus className="h-4 w-4" />
              Create a workspace
            </Button>
          }
        />
      )}

      {hasWorkspaces && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => {
            const count = counts[workspace.id];
            const isOwner = workspace.ownerId === user?.id;
            return (
              <li key={workspace.id}>
                <Link
                  to={`/workspaces/${workspace.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ring-1 ring-slate-900/[0.02] transition duration-200 ease-out-soft hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:ring-0 dark:hover:border-indigo-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 font-display text-lg font-bold text-white shadow-sm ring-1 ring-inset ring-white/20"
                      >
                        {workspaceInitial(workspace.name)}
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                          {workspace.name}
                        </h2>
                        <p className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                          /{workspace.slug}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition duration-200 ease-out-soft group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600" />
                  </div>

                  <div className="mt-5 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                      {count ? `${count.boards} ${count.boards === 1 ? 'board' : 'boards'}` : '— boards'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {count ? `${count.members} ${count.members === 1 ? 'member' : 'members'}` : '— members'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {isOwner ? (
                      <Badge tone="accent">Owner</Badge>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Member</span>
                    )}
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Updated {formatRelativeTime(workspace.updatedAt)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppPage>
  );
}
