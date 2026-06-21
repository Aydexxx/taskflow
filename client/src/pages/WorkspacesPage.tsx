import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Workspace } from '@taskflow/shared';
import { api, ApiRequestError } from '../lib/api';
import { AppHeader } from '../components/AppHeader';
import { Button, EmptyState, Input, Spinner } from '../components/ui';

export function WorkspacesPage(): JSX.Element {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <AppHeader title="Workspaces" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <form onSubmit={handleCreate} className="mb-8 flex gap-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New workspace name"
            aria-label="New workspace name"
            className="flex-1"
          />
          <Button type="submit" isLoading={isCreating} disabled={!name.trim()}>
            {isCreating ? 'Creating…' : 'Create workspace'}
          </Button>
        </form>
        {createError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{createError}</p>}

        {workspaces === null && !loadError && (
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Spinner className="h-4 w-4" />
            Loading workspaces…
          </div>
        )}
        {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
        {workspaces !== null && workspaces.length === 0 && (
          <EmptyState
            title="No workspaces yet"
            description="Create your first workspace above to start organizing boards and tasks."
          />
        )}

        <ul className="grid gap-4 sm:grid-cols-2">
          {workspaces?.map((workspace) => (
            <li key={workspace.id}>
              <Link
                to={`/workspaces/${workspace.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ring-1 ring-slate-900/[0.02] transition duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:ring-0 dark:hover:border-indigo-500/50"
              >
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{workspace.name}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">/{workspace.slug}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
