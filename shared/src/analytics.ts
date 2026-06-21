import type { CardPriority, ISODateString } from './models';

/**
 * Read-only analytics contract for a board, shared by server and client.
 *
 * Everything is computed server-side from current board state plus the
 * `card_moved` activity log; the client only renders. "Completion" is
 * approximated as a card residing in the board's last column (highest
 * position) — see the server analytics service for the exact rules.
 */

/** Current card distribution across the board's columns (left-to-right order). */
export interface StatusDatum {
  columnId: string;
  columnTitle: string;
  count: number;
}

/** Card counts grouped by assignee; `assigneeId` is null for the unassigned bucket. */
export interface AssigneeDatum {
  assigneeId: string | null;
  name: string;
  count: number;
}

/** Card counts grouped by priority (always one entry per priority, including zeros). */
export interface PriorityDatum {
  priority: CardPriority;
  count: number;
}

/** Completed-card count for a single week window. */
export interface ThroughputDatum {
  /** ISO timestamp for the start (Monday 00:00 UTC) of the week bucket. */
  weekStart: ISODateString;
  /** Short human label for the bucket, e.g. "Jun 9". */
  label: string;
  completed: number;
}

/** Cycle-time approximation: created -> entered the done column, in days. */
export interface CycleTimeSummary {
  /** Mean cycle time across completed cards, or null when none are completed. */
  averageDays: number | null;
  /** Median cycle time, or null when none are completed. */
  medianDays: number | null;
  /** Number of completed cards the averages are based on. */
  sampleSize: number;
}

/** The full analytics payload for `GET /api/boards/:boardId/analytics`. */
export interface BoardAnalytics {
  boardId: string;
  boardTitle: string;
  /** When the snapshot was computed (ISO timestamp). */
  generatedAt: ISODateString;
  /** Number of weeks covered by `throughput` (the `weeks` query param, clamped). */
  weeks: number;
  totalCards: number;
  /** Cards currently in the done column (highest-position column). */
  completedCount: number;
  /** Cards past their due date and not yet completed. */
  overdueCount: number;
  /** The done column used for completion/throughput/cycle-time, or null if the board has no columns. */
  doneColumnId: string | null;
  doneColumnTitle: string | null;
  cardsByStatus: StatusDatum[];
  cardsByAssignee: AssigneeDatum[];
  cardsByPriority: PriorityDatum[];
  throughput: ThroughputDatum[];
  cycleTime: CycleTimeSummary;
}
