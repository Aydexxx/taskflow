import { CARD_PRIORITIES, type Card, type CardPriority } from '@taskflow/shared';

/**
 * Board search/filtering is computed client-side over the already-loaded board
 * (the `columns` the board page holds in state) so results are instant as the
 * user types/toggles — no round trip per keystroke. Every filter is expressed as
 * a plain, serializable `BoardFilters` value plus the pure `cardMatchesFilters`
 * predicate below, which mirrors a natural REST query-string shape (`q`,
 * `assignee`, `label`, `priority`, `due`). If a board ever grows large enough
 * that scanning all cards client-side stops being instant, the same predicate
 * can move server-side (e.g. `GET /api/boards/:id?q=...&assignee=...`) without
 * changing this module's shape — only where it runs would change.
 */

export type DueFilter = 'overdue' | 'due_soon' | 'no_date';

export const DUE_FILTER_OPTIONS: readonly DueFilter[] = ['overdue', 'due_soon', 'no_date'];

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  overdue: 'Overdue',
  due_soon: 'Due soon',
  no_date: 'No due date',
};

/** "Due soon" window: due within this many ms from now, and not already overdue. */
const DUE_SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** Sentinel assignee filter value for "no assignee" — distinct from any real user id. */
export const UNASSIGNED = 'unassigned';

export interface BoardFilters {
  search: string;
  /** Member userIds; may include the UNASSIGNED sentinel. */
  assigneeIds: string[];
  labelIds: string[];
  priorities: CardPriority[];
  dueFilter: DueFilter | null;
}

export const EMPTY_FILTERS: BoardFilters = {
  search: '',
  assigneeIds: [],
  labelIds: [],
  priorities: [],
  dueFilter: null,
};

export function hasActiveFilters(filters: BoardFilters): boolean {
  return activeFilterCount(filters) > 0;
}

/** Number of distinct filter dimensions currently applied (for an "N active filters" badge). */
export function activeFilterCount(filters: BoardFilters): number {
  let count = 0;
  if (filters.search.trim() !== '') count += 1;
  if (filters.assigneeIds.length > 0) count += 1;
  if (filters.labelIds.length > 0) count += 1;
  if (filters.priorities.length > 0) count += 1;
  if (filters.dueFilter !== null) count += 1;
  return count;
}

/** Toggle `value` in/out of `list`, returning a new array (used by chip-style multi-selects). */
export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function matchesDueFilter(card: Card, dueFilter: DueFilter | null, now: number): boolean {
  if (dueFilter === null) return true;
  if (dueFilter === 'no_date') return card.dueDate === null;
  if (!card.dueDate) return false;
  const due = new Date(card.dueDate).getTime();
  if (dueFilter === 'overdue') return due < now;
  return due >= now && due <= now + DUE_SOON_WINDOW_MS;
}

/** True if `card` satisfies every active filter dimension (filters combine with AND). */
export function cardMatchesFilters(card: Card, filters: BoardFilters, now: number = Date.now()): boolean {
  if (filters.assigneeIds.length > 0) {
    const assigneeKey = card.assigneeId ?? UNASSIGNED;
    if (!filters.assigneeIds.includes(assigneeKey)) return false;
  }

  if (filters.priorities.length > 0 && !filters.priorities.includes(card.priority)) return false;

  if (filters.labelIds.length > 0) {
    const cardLabelIds = new Set(card.labels.map((label) => label.id));
    if (!filters.labelIds.some((id) => cardLabelIds.has(id))) return false;
  }

  if (!matchesDueFilter(card, filters.dueFilter, now)) return false;

  const search = filters.search.trim().toLowerCase();
  if (search) {
    const haystack = `${card.title} ${card.description ?? ''}`.toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  return true;
}

const PARAM_KEYS = {
  search: 'q',
  assignee: 'assignee',
  label: 'label',
  priority: 'priority',
  due: 'due',
} as const;

function splitParam(params: URLSearchParams, key: string): string[] {
  return (params.get(key) ?? '').split(',').filter(Boolean);
}

/** Parse `BoardFilters` out of a URL query string, ignoring unrelated params. */
export function filtersFromSearchParams(params: URLSearchParams): BoardFilters {
  const priorities = splitParam(params, PARAM_KEYS.priority).filter((value): value is CardPriority =>
    (CARD_PRIORITIES as readonly string[]).includes(value),
  );
  const due = params.get(PARAM_KEYS.due);
  const dueFilter = due && (DUE_FILTER_OPTIONS as readonly string[]).includes(due) ? (due as DueFilter) : null;

  return {
    search: params.get(PARAM_KEYS.search) ?? '',
    assigneeIds: splitParam(params, PARAM_KEYS.assignee),
    labelIds: splitParam(params, PARAM_KEYS.label),
    priorities,
    dueFilter,
  };
}

/**
 * Write `filters` into a copy of `base` (or a fresh `URLSearchParams`), clearing
 * each filter key when the corresponding value is empty/default so a reset
 * leaves no stale query params behind. Params unrelated to filtering (none exist
 * on the board route today, but this keeps the function honest) pass through.
 */
export function filtersToSearchParams(filters: BoardFilters, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base);
  setOrDelete(params, PARAM_KEYS.search, filters.search.trim());
  setOrDelete(params, PARAM_KEYS.assignee, filters.assigneeIds.join(','));
  setOrDelete(params, PARAM_KEYS.label, filters.labelIds.join(','));
  setOrDelete(params, PARAM_KEYS.priority, filters.priorities.join(','));
  setOrDelete(params, PARAM_KEYS.due, filters.dueFilter ?? '');
  return params;
}

function setOrDelete(params: URLSearchParams, key: string, value: string): void {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}
