/**
 * Fractional/indexed position helper.
 *
 * Items in an ordered list (columns within a board, cards within a column)
 * carry a `position: Float`. Inserting or moving an item to index `i` only
 * ever computes and writes that one row's position — as the midpoint of its
 * new neighbors — so siblings never need to be renumbered.
 *
 * Known tradeoff: repeatedly inserting at the exact same spot many times in
 * a row can eventually exhaust floating-point precision between two
 * neighbors. That's an accepted limitation of this scheme at this scale; a
 * production system under heavy reordering would periodically rebalance.
 */
const POSITION_GAP = 1024;

/** `siblings` must already be ordered ascending by `position` and must NOT include the item being placed. */
export function computeInsertPosition(siblings: Array<{ position: number }>, index: number): number {
  const clampedIndex = Math.max(0, Math.min(index, siblings.length));
  const before = siblings[clampedIndex - 1];
  const after = siblings[clampedIndex];

  if (before && after) return (before.position + after.position) / 2;
  if (before) return before.position + POSITION_GAP;
  if (after) return after.position - POSITION_GAP;
  return 0;
}
