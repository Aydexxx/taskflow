import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Label, WorkspaceMemberWithUser } from '@taskflow/shared';
import { FilterBar } from './FilterBar';
import { EMPTY_FILTERS, UNASSIGNED, type BoardFilters } from '../../lib/board/filters';
import type { SavedView } from '../../lib/board/savedViews';

function makeMember(overrides: Partial<WorkspaceMemberWithUser> & { userId: string; name: string }): WorkspaceMemberWithUser {
  return {
    id: `member-${overrides.userId}`,
    workspaceId: 'ws-1',
    userId: overrides.userId,
    role: 'MEMBER',
    createdAt: '',
    user: { id: overrides.userId, email: `${overrides.userId}@example.com`, name: overrides.name, avatarUrl: null, createdAt: '', updatedAt: '' },
  };
}

function makeLabel(overrides: Partial<Label>): Label {
  return { id: 'label', workspaceId: 'ws-1', name: 'Label', color: 'blue', createdAt: '', ...overrides };
}

const members = [makeMember({ userId: 'user-1', name: 'Alice' })];
const labels = [makeLabel({ id: 'label-urgent', name: 'Urgent' })];

function renderFilterBar(filters: BoardFilters, overrides: { savedViews?: SavedView[] } = {}) {
  const onFiltersChange = vi.fn();
  const onSaveView = vi.fn();
  const onApplyView = vi.fn();
  const onDeleteView = vi.fn();
  render(
    <FilterBar
      filters={filters}
      onFiltersChange={onFiltersChange}
      members={members}
      labels={labels}
      matchedCount={2}
      totalCount={3}
      savedViews={overrides.savedViews ?? []}
      onSaveView={onSaveView}
      onApplyView={onApplyView}
      onDeleteView={onDeleteView}
    />,
  );
  return { onFiltersChange, onSaveView, onApplyView, onDeleteView };
}

describe('FilterBar search input', () => {
  it('reports search text changes via onFiltersChange', () => {
    const { onFiltersChange } = renderFilterBar(EMPTY_FILTERS);
    fireEvent.change(screen.getByLabelText('Search cards'), { target: { value: 'launch' } });
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, search: 'launch' });
  });
});

describe('FilterBar assignee menu', () => {
  it('toggles a member on, and offers an Unassigned option', () => {
    const { onFiltersChange } = renderFilterBar(EMPTY_FILTERS);
    fireEvent.click(screen.getByRole('button', { name: 'Assignee' }));
    fireEvent.click(screen.getByText('Alice'));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, assigneeIds: ['user-1'] });

    fireEvent.click(screen.getByText('Unassigned'));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, assigneeIds: [UNASSIGNED] });
  });
});

describe('FilterBar label menu', () => {
  it('toggles a label on', () => {
    const { onFiltersChange } = renderFilterBar(EMPTY_FILTERS);
    fireEvent.click(screen.getByRole('button', { name: 'Labels' }));
    fireEvent.click(screen.getByText('Urgent'));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, labelIds: ['label-urgent'] });
  });
});

describe('FilterBar priority menu', () => {
  it('toggles a priority on', () => {
    const { onFiltersChange } = renderFilterBar(EMPTY_FILTERS);
    fireEvent.click(screen.getByRole('button', { name: 'Priority' }));
    fireEvent.click(screen.getByText('High'));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, priorities: ['HIGH'] });
  });
});

describe('FilterBar due date menu', () => {
  it('selects a due-date range', () => {
    const { onFiltersChange } = renderFilterBar(EMPTY_FILTERS);
    fireEvent.click(screen.getByRole('button', { name: 'Due date' }));
    fireEvent.click(screen.getByText('Overdue'));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, dueFilter: 'overdue' });
  });

  it('clicking the already-selected range clears it', () => {
    const active: BoardFilters = { ...EMPTY_FILTERS, dueFilter: 'overdue' };
    const { onFiltersChange } = renderFilterBar(active);
    fireEvent.click(screen.getByRole('button', { name: 'Due date' }));
    fireEvent.click(screen.getByText('Overdue'));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, dueFilter: null });
  });
});

describe('FilterBar active-filter indicator and reset', () => {
  it('hides the clear button and shows a plain count when no filters are active', () => {
    renderFilterBar(EMPTY_FILTERS);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    expect(screen.getByText('3 cards')).toBeInTheDocument();
  });

  it('shows a one-click reset and a matched/total count once a filter is active', () => {
    const { onFiltersChange } = renderFilterBar({ ...EMPTY_FILTERS, priorities: ['HIGH'] });
    expect(screen.getByText('2 of 3 cards')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onFiltersChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});

describe('FilterBar saved views', () => {
  it('lets the user name and save the current filters', () => {
    const { onSaveView } = renderFilterBar({ ...EMPTY_FILTERS, search: 'launch' });
    fireEvent.click(screen.getByRole('button', { name: 'Saved views' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Save current filters' }));
    fireEvent.change(screen.getByLabelText('New saved view name'), { target: { value: 'My view' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveView).toHaveBeenCalledWith('My view');
  });

  it('applies a saved view on click and deletes it via its trash icon', () => {
    const savedViews: SavedView[] = [
      { id: 'view-1', name: 'My view', filters: { ...EMPTY_FILTERS, search: 'launch' }, createdAt: '' },
    ];
    const { onApplyView, onDeleteView } = renderFilterBar(EMPTY_FILTERS, { savedViews });
    fireEvent.click(screen.getByRole('button', { name: 'Saved views' }));
    fireEvent.click(screen.getByText('My view'));
    expect(onApplyView).toHaveBeenCalledWith(savedViews[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete saved view: My view' }));
    expect(onDeleteView).toHaveBeenCalledWith('view-1');
  });
});
