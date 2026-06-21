import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CARD_PRIORITIES, type Label, type WorkspaceMemberWithUser } from '@taskflow/shared';
import {
  DUE_FILTER_LABELS,
  DUE_FILTER_OPTIONS,
  EMPTY_FILTERS,
  UNASSIGNED,
  activeFilterCount,
  hasActiveFilters,
  toggleValue,
  type BoardFilters,
} from '../../lib/board/filters';
import type { SavedView } from '../../lib/board/savedViews';
import { PRIORITY_LABELS } from '../../lib/board/priority';
import { labelSwatchClass } from '../../lib/board/labelColors';
import { Avatar } from '../Avatar';
import { TrashIcon, XIcon } from '../icons';
import { Button, Input } from '../ui';

interface FilterBarProps {
  filters: BoardFilters;
  onFiltersChange: (next: BoardFilters) => void;
  members: WorkspaceMemberWithUser[];
  labels: Label[];
  matchedCount: number;
  totalCount: number;
  savedViews: SavedView[];
  onSaveView: (name: string) => void;
  onApplyView: (view: SavedView) => void;
  onDeleteView: (viewId: string) => void;
}

/** Trigger button + click-outside-to-close panel, used for every filter dimension below. */
function FilterMenu({ label, activeCount, children }: { label: string; activeCount: number; children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium shadow-soft transition duration-150 ease-out-soft active:scale-[0.98] ${
          activeCount > 0
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700'
        }`}
      >
        {label}
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white"
          >
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-56 origin-top rounded-xl border border-slate-200 bg-white p-1.5 shadow-overlay ring-1 ring-slate-900/5 animate-slide-in-down dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10">
          {children}
        </div>
      )}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
      />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </label>
  );
}

function SavedViewsMenu({
  savedViews,
  filters,
  onApply,
  onDelete,
  onSave,
}: {
  savedViews: SavedView[];
  filters: BoardFilters;
  onApply: (view: SavedView) => void;
  onDelete: (viewId: string) => void;
  onSave: (name: string) => void;
}): JSX.Element {
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
    setIsNaming(false);
  }

  return (
    <FilterMenu label="Saved views" activeCount={0}>
      {savedViews.length === 0 && (
        <p className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">No saved views yet.</p>
      )}
      {savedViews.map((view) => (
        <div key={view.id} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onApply(view)}
            className="min-w-0 flex-1 truncate rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {view.name}
          </button>
          <button
            type="button"
            onClick={() => onDelete(view.id)}
            aria-label={`Delete saved view: ${view.name}`}
            className="flex-shrink-0 rounded p-1 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-700">
        {isNaming ? (
          <form onSubmit={handleSubmit} className="flex gap-1 px-1 py-1">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsNaming(false);
                  setName('');
                }
              }}
              placeholder="View name"
              aria-label="New saved view name"
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Save
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsNaming(true)}
            disabled={!hasActiveFilters(filters)}
            title={hasActiveFilters(filters) ? undefined : 'Apply at least one filter to save a view'}
            className="w-full rounded px-2 py-1.5 text-left text-sm text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:text-indigo-400 dark:hover:bg-indigo-500/10 dark:disabled:text-slate-600"
          >
            + Save current filters
          </button>
        )}
      </div>
    </FilterMenu>
  );
}

/**
 * Board search/filter bar. All filter state lives in `filters` (owned by the
 * caller and kept in sync with the URL query string), so this component is a
 * pure controlled view: every interaction calls `onFiltersChange` with the next
 * value, never mutates locally.
 */
export function FilterBar({
  filters,
  onFiltersChange,
  members,
  labels,
  matchedCount,
  totalCount,
  savedViews,
  onSaveView,
  onApplyView,
  onDeleteView,
}: FilterBarProps): JSX.Element {
  const filtersActive = hasActiveFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
      <Input
        value={filters.search}
        onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
        placeholder="Search cards…"
        aria-label="Search cards"
        className="w-full max-w-xs"
      />

      <FilterMenu label="Assignee" activeCount={filters.assigneeIds.length}>
        <CheckboxRow
          checked={filters.assigneeIds.includes(UNASSIGNED)}
          onChange={() => onFiltersChange({ ...filters, assigneeIds: toggleValue(filters.assigneeIds, UNASSIGNED) })}
        >
          Unassigned
        </CheckboxRow>
        {members.map((member) => (
          <CheckboxRow
            key={member.userId}
            checked={filters.assigneeIds.includes(member.userId)}
            onChange={() =>
              onFiltersChange({ ...filters, assigneeIds: toggleValue(filters.assigneeIds, member.userId) })
            }
          >
            <span className="flex items-center gap-2">
              <Avatar name={member.user.name} avatarUrl={member.user.avatarUrl} />
              {member.user.name}
            </span>
          </CheckboxRow>
        ))}
      </FilterMenu>

      <FilterMenu label="Labels" activeCount={filters.labelIds.length}>
        {labels.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">No labels yet.</p>}
        {labels.map((label) => (
          <CheckboxRow
            key={label.id}
            checked={filters.labelIds.includes(label.id)}
            onChange={() => onFiltersChange({ ...filters, labelIds: toggleValue(filters.labelIds, label.id) })}
          >
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${labelSwatchClass(label.color)}`} />
              {label.name}
            </span>
          </CheckboxRow>
        ))}
      </FilterMenu>

      <FilterMenu label="Priority" activeCount={filters.priorities.length}>
        {CARD_PRIORITIES.map((priority) => (
          <CheckboxRow
            key={priority}
            checked={filters.priorities.includes(priority)}
            onChange={() => onFiltersChange({ ...filters, priorities: toggleValue(filters.priorities, priority) })}
          >
            {PRIORITY_LABELS[priority]}
          </CheckboxRow>
        ))}
      </FilterMenu>

      <FilterMenu label="Due date" activeCount={filters.dueFilter ? 1 : 0}>
        {DUE_FILTER_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onFiltersChange({ ...filters, dueFilter: filters.dueFilter === option ? null : option })}
            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
              filters.dueFilter === option
                ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {DUE_FILTER_LABELS[option]}
          </button>
        ))}
      </FilterMenu>

      <SavedViewsMenu
        savedViews={savedViews}
        filters={filters}
        onApply={onApplyView}
        onDelete={onDeleteView}
        onSave={onSaveView}
      />

      {filtersActive && (
        <button
          type="button"
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
          className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <XIcon className="h-3.5 w-3.5" />
          Clear filters ({activeFilterCount(filters)})
        </button>
      )}

      <span className="text-sm text-slate-400 dark:text-slate-500">
        {filtersActive ? `${matchedCount} of ${totalCount} cards` : `${totalCount} cards`}
      </span>
    </div>
  );
}
