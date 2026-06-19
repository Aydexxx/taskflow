import type { Card, Column } from '@taskflow/shared';
import type { ColumnWithCards } from './reorder';

/**
 * Pure reducers that apply a remote board mutation to local board state.
 *
 * Every reducer is **idempotent by entity id** and re-derives order from each
 * entity's authoritative `position`. That single property gives us three things
 * the realtime layer needs for free:
 *
 *  - No echo/double-apply: when the originating user receives the broadcast of
 *    their own change, upserting by id just replaces the entry they already
 *    applied optimistically — never a duplicate.
 *  - Out-of-order safety: order comes from `position`, not arrival order, so two
 *    events landing in either sequence converge to the same layout.
 *  - Reconnect resync friendliness: re-applying an event already reflected in a
 *    fresh refetch is a no-op.
 */

function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

/**
 * Insert or update a card, honoring its `columnId` (so a moved card lands in its
 * new column and is removed from the old one). If the target column is not in
 * state yet — e.g. a `card:created` arrived before its `column:created` — the
 * card is dropped rather than throwing; a resync will reconcile it.
 */
export function applyCardUpsert(columns: ColumnWithCards[], card: Card): ColumnWithCards[] {
  return columns.map((column) => {
    if (column.id === card.columnId) {
      const others = column.cards.filter((existing) => existing.id !== card.id);
      return { ...column, cards: sortByPosition([...others, card]) };
    }
    if (column.cards.some((existing) => existing.id === card.id)) {
      return { ...column, cards: column.cards.filter((existing) => existing.id !== card.id) };
    }
    return column;
  });
}

export function applyCardDelete(columns: ColumnWithCards[], cardId: string): ColumnWithCards[] {
  return columns.map((column) => {
    if (!column.cards.some((card) => card.id === cardId)) return column;
    return { ...column, cards: column.cards.filter((card) => card.id !== cardId) };
  });
}

/** Insert or update a column, preserving its existing cards, then re-sort by position. */
export function applyColumnUpsert(columns: ColumnWithCards[], column: Column): ColumnWithCards[] {
  const exists = columns.some((existing) => existing.id === column.id);
  const next = exists
    ? columns.map((existing) => (existing.id === column.id ? { ...existing, ...column } : existing))
    : [...columns, { ...column, cards: [] }];
  return sortByPosition(next);
}

export function applyColumnDelete(columns: ColumnWithCards[], columnId: string): ColumnWithCards[] {
  return columns.filter((column) => column.id !== columnId);
}

/** Normalize freshly-loaded board state into the same position-sorted shape the reducers maintain. */
export function normalizeBoardColumns(columns: ColumnWithCards[]): ColumnWithCards[] {
  return sortByPosition(columns).map((column) => ({ ...column, cards: sortByPosition(column.cards) }));
}
