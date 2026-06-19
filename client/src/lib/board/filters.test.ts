import { describe, expect, it } from 'vitest';
import type { Card, Label } from '@taskflow/shared';
import {
  EMPTY_FILTERS,
  UNASSIGNED,
  activeFilterCount,
  cardMatchesFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  hasActiveFilters,
  toggleValue,
  type BoardFilters,
} from './filters';

const NOW = new Date('2026-06-20T12:00:00.000Z').getTime();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function makeLabel(overrides: Partial<Label>): Label {
  return { id: 'label', workspaceId: 'ws-1', name: 'Label', color: 'blue', createdAt: '', ...overrides };
}

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: 'card',
    columnId: 'col-1',
    title: 'Card',
    description: null,
    position: 0,
    assigneeId: null,
    priority: 'MEDIUM',
    labels: [],
    dueDate: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const overdueCard = makeCard({
  id: 'overdue',
  title: 'Write report',
  description: 'quarterly numbers',
  assigneeId: 'user-1',
  priority: 'HIGH',
  labels: [makeLabel({ id: 'label-urgent', name: 'Urgent' })],
  dueDate: new Date(NOW - ONE_DAY_MS).toISOString(),
});

const dueSoonCard = makeCard({
  id: 'due-soon',
  title: 'Plan launch',
  description: null,
  assigneeId: null,
  priority: 'LOW',
  labels: [],
  dueDate: new Date(NOW + ONE_DAY_MS).toISOString(),
});

const noDateCard = makeCard({
  id: 'no-date',
  title: 'Buy snacks',
  description: 'for the team party',
  assigneeId: 'user-2',
  priority: 'MEDIUM',
  labels: [makeLabel({ id: 'label-fun', name: 'Fun' })],
  dueDate: null,
});

const allCards = [overdueCard, dueSoonCard, noDateCard];

function matching(filters: BoardFilters): string[] {
  return allCards.filter((card) => cardMatchesFilters(card, filters, NOW)).map((card) => card.id);
}

describe('cardMatchesFilters: assignee', () => {
  it('matches cards assigned to any of the selected members', () => {
    expect(matching({ ...EMPTY_FILTERS, assigneeIds: ['user-2'] })).toEqual(['no-date']);
  });

  it('matches unassigned cards via the UNASSIGNED sentinel', () => {
    expect(matching({ ...EMPTY_FILTERS, assigneeIds: [UNASSIGNED] })).toEqual(['due-soon']);
  });
});

describe('cardMatchesFilters: label', () => {
  it('matches cards carrying any of the selected labels', () => {
    expect(matching({ ...EMPTY_FILTERS, labelIds: ['label-fun'] })).toEqual(['no-date']);
  });
});

describe('cardMatchesFilters: priority', () => {
  it('matches cards at any of the selected priorities', () => {
    expect(matching({ ...EMPTY_FILTERS, priorities: ['HIGH', 'LOW'] })).toEqual(['overdue', 'due-soon']);
  });
});

describe('cardMatchesFilters: due date range', () => {
  it('overdue matches cards whose due date is in the past', () => {
    expect(matching({ ...EMPTY_FILTERS, dueFilter: 'overdue' })).toEqual(['overdue']);
  });

  it('due_soon matches cards due within the upcoming window', () => {
    expect(matching({ ...EMPTY_FILTERS, dueFilter: 'due_soon' })).toEqual(['due-soon']);
  });

  it('no_date matches cards without a due date', () => {
    expect(matching({ ...EMPTY_FILTERS, dueFilter: 'no_date' })).toEqual(['no-date']);
  });
});

describe('cardMatchesFilters: free-text search', () => {
  it('matches against the title, case-insensitively', () => {
    expect(matching({ ...EMPTY_FILTERS, search: 'REPORT' })).toEqual(['overdue']);
  });

  it('matches against the description', () => {
    expect(matching({ ...EMPTY_FILTERS, search: 'team party' })).toEqual(['no-date']);
  });

  it('matches nothing when no card contains the term', () => {
    expect(matching({ ...EMPTY_FILTERS, search: 'nonexistent' })).toEqual([]);
  });
});

describe('cardMatchesFilters: combined filters (AND)', () => {
  it('requires every active dimension to match, not just one', () => {
    // The "Urgent" label only appears on the overdue card, but priority HIGH+overdue
    // also only describes that same card — combined they still match it.
    expect(matching({ ...EMPTY_FILTERS, labelIds: ['label-urgent'], priorities: ['HIGH'] })).toEqual(['overdue']);
  });

  it('returns nothing when filters target disjoint cards', () => {
    // "Fun" label belongs to the no-date card; HIGH priority belongs to the overdue
    // card. No single card satisfies both, so the AND combination yields nothing.
    expect(matching({ ...EMPTY_FILTERS, labelIds: ['label-fun'], priorities: ['HIGH'] })).toEqual([]);
  });

  it('combines assignee, priority, and search', () => {
    expect(
      matching({ ...EMPTY_FILTERS, assigneeIds: ['user-2'], priorities: ['MEDIUM'], search: 'snacks' }),
    ).toEqual(['no-date']);
  });
});

describe('reset / active-filter accounting', () => {
  it('EMPTY_FILTERS has no active filters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('counts each non-empty dimension once, search included', () => {
    const filters: BoardFilters = {
      search: 'foo',
      assigneeIds: ['user-1'],
      labelIds: [],
      priorities: ['HIGH', 'LOW'],
      dueFilter: 'overdue',
    };
    expect(activeFilterCount(filters)).toBe(4);
    expect(hasActiveFilters(filters)).toBe(true);
  });

  it('a whitespace-only search does not count as active', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: '   ' })).toBe(false);
  });
});

describe('toggleValue', () => {
  it('adds a value not yet present', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes a value already present', () => {
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('URL query string round-trip', () => {
  it('serializes and parses back to the same filters', () => {
    const filters: BoardFilters = {
      search: 'launch plan',
      assigneeIds: ['user-1', UNASSIGNED],
      labelIds: ['label-urgent'],
      priorities: ['HIGH', 'LOW'],
      dueFilter: 'due_soon',
    };
    const params = filtersToSearchParams(filters);
    expect(filtersFromSearchParams(params)).toEqual(filters);
  });

  it('produces no filter params for EMPTY_FILTERS (a clean, shareable "no filter" URL)', () => {
    const params = filtersToSearchParams(EMPTY_FILTERS);
    expect(params.toString()).toBe('');
  });

  it('clears stale keys when filters are reset, without touching unrelated params', () => {
    const base = new URLSearchParams('foo=bar&q=stale&priority=HIGH');
    const params = filtersToSearchParams(EMPTY_FILTERS, base);
    expect(params.get('foo')).toBe('bar');
    expect(params.has('q')).toBe(false);
    expect(params.has('priority')).toBe(false);
  });

  it('ignores unknown/invalid values from a hand-edited URL instead of throwing', () => {
    const params = new URLSearchParams('priority=NOT_REAL,HIGH&due=not_a_range');
    const filters = filtersFromSearchParams(params);
    expect(filters.priorities).toEqual(['HIGH']);
    expect(filters.dueFilter).toBeNull();
  });
});
