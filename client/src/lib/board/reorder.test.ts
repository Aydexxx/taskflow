import { describe, expect, it } from 'vitest';
import type { Over } from '@dnd-kit/core';
import {
  type ColumnWithCards,
  moveCard,
  moveCardAcrossColumns,
  reorderCardsWithinColumn,
  reorderColumns,
  resolveOverColumn,
} from './reorder';

function makeColumns(): ColumnWithCards[] {
  return [
    {
      id: 'col-1',
      boardId: 'board-1',
      title: 'To Do',
      position: 0,
      createdAt: '',
      updatedAt: '',
      cards: [
        { id: 'card-a', columnId: 'col-1', title: 'A', description: null, position: 0, assigneeId: null, priority: 'MEDIUM', labels: [], dueDate: null, createdAt: '', updatedAt: '' },
        { id: 'card-b', columnId: 'col-1', title: 'B', description: null, position: 1, assigneeId: null, priority: 'MEDIUM', labels: [], dueDate: null, createdAt: '', updatedAt: '' },
        { id: 'card-c', columnId: 'col-1', title: 'C', description: null, position: 2, assigneeId: null, priority: 'MEDIUM', labels: [], dueDate: null, createdAt: '', updatedAt: '' },
      ],
    },
    {
      id: 'col-2',
      boardId: 'board-1',
      title: 'Doing',
      position: 1,
      createdAt: '',
      updatedAt: '',
      cards: [
        { id: 'card-d', columnId: 'col-2', title: 'D', description: null, position: 0, assigneeId: null, priority: 'MEDIUM', labels: [], dueDate: null, createdAt: '', updatedAt: '' },
      ],
    },
  ];
}

describe('reorderColumns', () => {
  it('moves a column to a new index', () => {
    const columns = makeColumns();
    const result = reorderColumns(columns, 0, 1);
    expect(result.map((c) => c.id)).toEqual(['col-2', 'col-1']);
  });
});

describe('reorderCardsWithinColumn', () => {
  it('reorders cards within the target column only', () => {
    const columns = makeColumns();
    const result = reorderCardsWithinColumn(columns, 'col-1', 0, 2);
    expect(result.find((c) => c.id === 'col-1')?.cards.map((card) => card.id)).toEqual(['card-b', 'card-c', 'card-a']);
    expect(result.find((c) => c.id === 'col-2')?.cards.map((card) => card.id)).toEqual(['card-d']);
  });
});

describe('moveCardAcrossColumns', () => {
  it('removes the card from the source column and inserts it at the target index', () => {
    const columns = makeColumns();
    const result = moveCardAcrossColumns(columns, 'col-1', 'col-2', 0, 1);
    expect(result.find((c) => c.id === 'col-1')?.cards.map((card) => card.id)).toEqual(['card-b', 'card-c']);
    expect(result.find((c) => c.id === 'col-2')?.cards.map((card) => card.id)).toEqual(['card-d', 'card-a']);
  });
});

describe('moveCard', () => {
  it('delegates to a within-column reorder when source and target columns match', () => {
    const columns = makeColumns();
    const result = moveCard(columns, 'card-a', 'col-1', 2);
    expect(result.find((c) => c.id === 'col-1')?.cards.map((card) => card.id)).toEqual(['card-b', 'card-c', 'card-a']);
  });

  it('delegates to a cross-column move when the target column differs', () => {
    const columns = makeColumns();
    const result = moveCard(columns, 'card-b', 'col-2', 0);
    expect(result.find((c) => c.id === 'col-1')?.cards.map((card) => card.id)).toEqual(['card-a', 'card-c']);
    expect(result.find((c) => c.id === 'col-2')?.cards.map((card) => card.id)).toEqual(['card-b', 'card-d']);
  });

  it('returns the columns unchanged when the card cannot be found', () => {
    const columns = makeColumns();
    expect(moveCard(columns, 'missing-card', 'col-2', 0)).toBe(columns);
  });
});

function makeOver(id: string, data: Record<string, unknown>): Over {
  return { id, rect: {} as Over['rect'], disabled: false, data: { current: data } } as Over;
}

describe('resolveOverColumn', () => {
  it('targets the end of a column when hovering the column itself', () => {
    const columns = makeColumns();
    const over = makeOver('col-2', { type: 'column' });
    expect(resolveOverColumn(over, columns)).toEqual({ columnId: 'col-2', index: 1 });
  });

  it('targets the hovered card index when hovering a card', () => {
    const columns = makeColumns();
    const over = makeOver('card-b', { type: 'card', columnId: 'col-1' });
    expect(resolveOverColumn(over, columns)).toEqual({ columnId: 'col-1', index: 1 });
  });

  it('returns null when the column cannot be resolved', () => {
    const columns = makeColumns();
    const over = makeOver('card-x', { type: 'card', columnId: 'missing' });
    expect(resolveOverColumn(over, columns)).toBeNull();
  });
});

describe('dropping a card into an empty column', () => {
  function makeColumnsWithEmpty(): ColumnWithCards[] {
    return [
      {
        id: 'col-1',
        boardId: 'board-1',
        title: 'To Do',
        position: 0,
        createdAt: '',
        updatedAt: '',
        cards: [
          { id: 'card-a', columnId: 'col-1', title: 'A', description: null, position: 0, assigneeId: null, priority: 'MEDIUM', labels: [], dueDate: null, createdAt: '', updatedAt: '' },
        ],
      },
      { id: 'col-empty', boardId: 'board-1', title: 'Done', position: 1, createdAt: '', updatedAt: '', cards: [] },
    ];
  }

  it('resolves the empty column dropzone to index 0 (columnId read from data, not the namespaced over.id)', () => {
    const columns = makeColumnsWithEmpty();
    // BoardColumn registers the card-list droppable as `col-dropzone:<id>`, with
    // the real columnId in its data — the only droppable an empty column exposes.
    const over = makeOver('col-dropzone:col-empty', { type: 'column', columnId: 'col-empty' });
    expect(resolveOverColumn(over, columns)).toEqual({ columnId: 'col-empty', index: 0 });
  });

  it('moveCard drops the card into the empty column at position 0', () => {
    const columns = makeColumnsWithEmpty();
    const result = moveCard(columns, 'card-a', 'col-empty', 0);
    expect(result.find((c) => c.id === 'col-1')?.cards).toHaveLength(0);
    expect(result.find((c) => c.id === 'col-empty')?.cards.map((card) => card.id)).toEqual(['card-a']);
  });
});
