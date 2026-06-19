import { EMPTY_FILTERS, type BoardFilters } from './filters';

/**
 * Saved views are a per-user convenience (a quick way to re-apply a named
 * filter set), not collaborative board state, so they're kept in localStorage
 * rather than a backend table — no migration, route, or authorization surface
 * for something that never needs to sync across devices or be seen by other
 * board members. If that changes later, this module's function signatures
 * already mirror what a small REST resource (list/create/delete) would look
 * like, so swapping the storage backend wouldn't ripple into callers.
 */

export interface SavedView {
  id: string;
  name: string;
  filters: BoardFilters;
  createdAt: string;
}

const STORAGE_PREFIX = 'taskflow:savedViews:';

function storageKey(boardId: string): string {
  return `${STORAGE_PREFIX}${boardId}`;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listSavedViews(boardId: string): SavedView[] {
  try {
    const raw = window.localStorage.getItem(storageKey(boardId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
  } catch {
    return [];
  }
}

function persist(boardId: string, views: SavedView[]): void {
  try {
    window.localStorage.setItem(storageKey(boardId), JSON.stringify(views));
  } catch {
    /* localStorage unavailable (private mode, quota); the view just won't persist */
  }
}

export function saveView(boardId: string, name: string, filters: BoardFilters = EMPTY_FILTERS): SavedView[] {
  const view: SavedView = { id: generateId(), name, filters, createdAt: new Date().toISOString() };
  const updated = [...listSavedViews(boardId), view];
  persist(boardId, updated);
  return updated;
}

export function deleteSavedView(boardId: string, viewId: string): SavedView[] {
  const updated = listSavedViews(boardId).filter((view) => view.id !== viewId);
  persist(boardId, updated);
  return updated;
}
