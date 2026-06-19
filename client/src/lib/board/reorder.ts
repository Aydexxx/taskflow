import { arrayMove } from '@dnd-kit/sortable';
import type { Over } from '@dnd-kit/core';
import type { BoardWithChildren } from '@taskflow/shared';

/** A column with its cards eagerly loaded, as returned by `BoardWithChildren`. */
export type ColumnWithCards = BoardWithChildren['columns'][number];

export function reorderColumns(
  columns: ColumnWithCards[],
  fromIndex: number,
  toIndex: number,
): ColumnWithCards[] {
  return arrayMove(columns, fromIndex, toIndex);
}

export function reorderCardsWithinColumn(
  columns: ColumnWithCards[],
  columnId: string,
  fromIndex: number,
  toIndex: number,
): ColumnWithCards[] {
  return columns.map((column) =>
    column.id === columnId ? { ...column, cards: arrayMove(column.cards, fromIndex, toIndex) } : column,
  );
}

export function moveCardAcrossColumns(
  columns: ColumnWithCards[],
  fromColumnId: string,
  toColumnId: string,
  fromIndex: number,
  toIndex: number,
): ColumnWithCards[] {
  const fromColumn = columns.find((column) => column.id === fromColumnId);
  const card = fromColumn?.cards[fromIndex];
  if (!fromColumn || !card) return columns;

  return columns.map((column) => {
    if (column.id === fromColumnId) {
      return { ...column, cards: column.cards.filter((_, index) => index !== fromIndex) };
    }
    if (column.id === toColumnId) {
      const nextCards = [...column.cards];
      nextCards.splice(toIndex, 0, card);
      return { ...column, cards: nextCards };
    }
    return column;
  });
}

/** Moves a card to `toColumnId` at `toIndex`, whether or not it changes columns. */
export function moveCard(
  columns: ColumnWithCards[],
  cardId: string,
  toColumnId: string,
  toIndex: number,
): ColumnWithCards[] {
  const fromColumn = columns.find((column) => column.cards.some((card) => card.id === cardId));
  if (!fromColumn) return columns;
  const fromIndex = fromColumn.cards.findIndex((card) => card.id === cardId);

  if (fromColumn.id === toColumnId) {
    return reorderCardsWithinColumn(columns, toColumnId, fromIndex, toIndex);
  }
  return moveCardAcrossColumns(columns, fromColumn.id, toColumnId, fromIndex, toIndex);
}

export interface OverColumnTarget {
  columnId: string;
  index: number;
}

/**
 * Resolves which column (and target card index within it) a dnd-kit `over`
 * target corresponds to. `over` is either a card (data.type === 'card', in
 * which case we land just before it) or a column droppable (data.type ===
 * 'column' — the column's sortable node or its dedicated card-list dropzone,
 * e.g. an empty column or the gap below its last card — so the target is the
 * end of its list). Column-type droppables carry `columnId` in their data
 * (the dropzone's own `over.id` is namespaced, so we can't rely on it).
 */
export function resolveOverColumn(over: Over, columns: ColumnWithCards[]): OverColumnTarget | null {
  const type = over.data.current?.type as 'column' | 'card' | undefined;

  if (type === 'column') {
    const columnId = (over.data.current?.columnId as string | undefined) ?? (over.id as string);
    const column = columns.find((c) => c.id === columnId);
    return column ? { columnId: column.id, index: column.cards.length } : null;
  }

  if (type === 'card') {
    const columnId = over.data.current?.columnId as string | undefined;
    if (!columnId) return null;
    const column = columns.find((c) => c.id === columnId);
    if (!column) return null;
    const index = column.cards.findIndex((card) => card.id === over.id);
    return { columnId, index: index === -1 ? column.cards.length : index };
  }

  return null;
}
