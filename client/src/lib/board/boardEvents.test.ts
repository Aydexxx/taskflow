import { describe, expect, it } from 'vitest';
import type { Card, Column } from '@taskflow/shared';
import { applyCardDelete, applyCardUpsert, applyColumnDelete, applyColumnUpsert } from './boardEvents';
import type { ColumnWithCards } from './reorder';

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

function makeColumns(): ColumnWithCards[] {
  return [
    {
      id: 'col-1',
      boardId: 'board-1',
      title: 'To Do',
      position: 0,
      createdAt: '',
      updatedAt: '',
      cards: [makeCard({ id: 'card-a', position: 0 })],
    },
    { id: 'col-2', boardId: 'board-1', title: 'Done', position: 1024, createdAt: '', updatedAt: '', cards: [] },
  ];
}

describe('board event reducers are idempotent (applying the same event twice is a no-op)', () => {
  it('applyCardUpsert: creating a card does not duplicate it for the originating client', () => {
    // The originating client applies its own optimistic insert AND then receives
    // the server's card:created echo — both paths go through applyCardUpsert, so
    // the card must appear exactly once.
    const columns = makeColumns();
    const created = makeCard({ id: 'card-new', columnId: 'col-1', position: 1024 });

    const afterOptimistic = applyCardUpsert(columns, created);
    const afterEcho = applyCardUpsert(afterOptimistic, created);

    expect(afterOptimistic.find((c) => c.id === 'col-1')?.cards.filter((c) => c.id === 'card-new')).toHaveLength(1);
    expect(afterEcho).toEqual(afterOptimistic);
  });

  it('applyColumnUpsert twice equals once', () => {
    const columns = makeColumns();
    const created: Column = {
      id: 'col-3',
      boardId: 'board-1',
      title: 'Review',
      position: 2048,
      createdAt: '',
      updatedAt: '',
    };

    const once = applyColumnUpsert(columns, created);
    const twice = applyColumnUpsert(once, created);

    expect(once.filter((c) => c.id === 'col-3')).toHaveLength(1);
    expect(twice).toEqual(once);
  });

  it('applyCardDelete twice equals once (no throw on the second apply)', () => {
    const columns = makeColumns();
    const once = applyCardDelete(columns, 'card-a');
    const twice = applyCardDelete(once, 'card-a');

    expect(once.find((c) => c.id === 'col-1')?.cards).toHaveLength(0);
    expect(twice).toEqual(once);
  });

  it('applyColumnDelete twice equals once', () => {
    const columns = makeColumns();
    const once = applyColumnDelete(columns, 'col-2');
    const twice = applyColumnDelete(once, 'col-2');

    expect(once.some((c) => c.id === 'col-2')).toBe(false);
    expect(twice).toEqual(once);
  });

  it('applyCardUpsert reconciles a move without leaving a duplicate behind, and re-applying is a no-op', () => {
    const columns = makeColumns();
    const moved = makeCard({ id: 'card-a', columnId: 'col-2', position: 0 });

    const next = applyCardUpsert(columns, moved);
    expect(next.find((c) => c.id === 'col-1')?.cards.some((c) => c.id === 'card-a')).toBe(false);
    expect(next.find((c) => c.id === 'col-2')?.cards.map((c) => c.id)).toEqual(['card-a']);

    // A second client (or our own echo) applying the same move sees it once.
    expect(applyCardUpsert(next, moved)).toEqual(next);
  });
});
