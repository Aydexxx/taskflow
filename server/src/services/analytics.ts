import type {
  AssigneeDatum,
  BoardAnalytics,
  CardPriority,
  CycleTimeSummary,
  PriorityDatum,
  StatusDatum,
  ThroughputDatum,
} from '@taskflow/shared';
import { CARD_PRIORITIES } from '@taskflow/shared';
import { prisma } from './prisma';
import { requireWorkspaceMember, resolveBoardWorkspaceId } from './authorization';
import { NotFoundError } from '../errors/HttpError';

const DEFAULT_WEEKS = 8;
const MIN_WEEKS = 1;
const MAX_WEEKS = 26;
const MS_PER_DAY = 86_400_000;

/** Clamp the requested throughput window to a sane range. */
export function normalizeWeeks(weeks: number | undefined): number {
  if (weeks === undefined || Number.isNaN(weeks)) return DEFAULT_WEEKS;
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.trunc(weeks)));
}

/** Monday 00:00 UTC of the week containing `date`. */
function startOfWeekUTC(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const shiftToMonday = weekday === 0 ? -6 : 1 - weekday;
  day.setUTCDate(day.getUTCDate() + shiftToMonday);
  return day;
}

function weekLabel(weekStart: Date): string {
  return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2 : (sorted[mid] as number);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Compute a read-only analytics snapshot for a board.
 *
 * Authorization: any workspace member may view (read-only). "Completion" is
 * approximated as a card residing in the board's last column (highest
 * position); a card's completion time is the most recent `card_moved` activity
 * into that column, falling back to the card's creation time for cards that
 * started there.
 */
export async function getBoardAnalytics(boardId: string, userId: string, weeksInput?: number): Promise<BoardAnalytics> {
  const workspaceId = await resolveBoardWorkspaceId(boardId);
  await requireWorkspaceMember(workspaceId, userId);
  const weeks = normalizeWeeks(weeksInput);

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            select: { id: true, assigneeId: true, priority: true, dueDate: true, createdAt: true, columnId: true },
          },
        },
      },
    },
  });
  if (!board) throw new NotFoundError('Board not found');

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true } } },
  });
  const memberNameById = new Map(members.map((member) => [member.user.id, member.user.name]));

  const doneColumn = board.columns.length > 0 ? board.columns[board.columns.length - 1] : null;
  const doneColumnId = doneColumn?.id ?? null;

  // Completion timestamps from the activity log: latest move INTO the done column per card.
  const completionByCard = new Map<string, Date>();
  if (doneColumn) {
    const moves = await prisma.activity.findMany({
      where: { boardId, type: 'card_moved' },
      orderBy: { createdAt: 'asc' },
      select: { metadata: true, createdAt: true },
    });
    for (const move of moves) {
      const metadata = JSON.parse(move.metadata) as { cardId?: string; toColumnTitle?: string };
      if (metadata.cardId && metadata.toColumnTitle === doneColumn.title) {
        completionByCard.set(metadata.cardId, move.createdAt); // ascending order ⇒ last wins
      }
    }
  }

  const now = Date.now();
  const allCards = board.columns.flatMap((column) => column.cards);

  // --- Status (column distribution) ---
  const cardsByStatus: StatusDatum[] = board.columns.map((column) => ({
    columnId: column.id,
    columnTitle: column.title,
    count: column.cards.length,
  }));

  // --- Priority (always all four, including zeros) ---
  const priorityCounts = new Map<CardPriority, number>(CARD_PRIORITIES.map((priority) => [priority, 0]));
  for (const card of allCards) {
    const priority = card.priority as CardPriority;
    priorityCounts.set(priority, (priorityCounts.get(priority) ?? 0) + 1);
  }
  const cardsByPriority: PriorityDatum[] = CARD_PRIORITIES.map((priority) => ({
    priority,
    count: priorityCounts.get(priority) ?? 0,
  }));

  // --- Assignee ---
  const assigneeCounts = new Map<string | null, number>();
  for (const card of allCards) {
    assigneeCounts.set(card.assigneeId, (assigneeCounts.get(card.assigneeId) ?? 0) + 1);
  }
  const cardsByAssignee: AssigneeDatum[] = [...assigneeCounts.entries()]
    .map(([assigneeId, count]) => ({
      assigneeId,
      name: assigneeId === null ? 'Unassigned' : memberNameById.get(assigneeId) ?? 'Unknown',
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // --- Completion-derived metrics ---
  const doneCardIds = new Set(doneColumn?.cards.map((card) => card.id) ?? []);
  const completedCards = allCards.filter((card) => doneCardIds.has(card.id));
  const completedCount = completedCards.length;

  const overdueCount = allCards.filter(
    (card) => card.dueDate !== null && card.dueDate.getTime() < now && !doneCardIds.has(card.id),
  ).length;

  // --- Throughput (last N week buckets) ---
  const currentWeekStart = startOfWeekUTC(new Date(now));
  const buckets: ThroughputDatum[] = [];
  const bucketIndexByTime = new Map<number, number>();
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(currentWeekStart.getTime() - i * 7 * MS_PER_DAY);
    bucketIndexByTime.set(weekStart.getTime(), buckets.length);
    buckets.push({ weekStart: weekStart.toISOString(), label: weekLabel(weekStart), completed: 0 });
  }

  const cycleTimes: number[] = [];
  for (const card of completedCards) {
    const completedAt = completionByCard.get(card.id) ?? card.createdAt;
    const cycleDays = Math.max(0, (completedAt.getTime() - card.createdAt.getTime()) / MS_PER_DAY);
    cycleTimes.push(cycleDays);

    const bucketIndex = bucketIndexByTime.get(startOfWeekUTC(completedAt).getTime());
    if (bucketIndex !== undefined) {
      (buckets[bucketIndex] as ThroughputDatum).completed += 1;
    }
  }

  const averageDays = cycleTimes.length > 0 ? cycleTimes.reduce((sum, days) => sum + days, 0) / cycleTimes.length : null;
  const medianDays = median(cycleTimes);
  const cycleTime: CycleTimeSummary = {
    averageDays: averageDays === null ? null : round1(averageDays),
    medianDays: medianDays === null ? null : round1(medianDays),
    sampleSize: cycleTimes.length,
  };

  return {
    boardId: board.id,
    boardTitle: board.title,
    generatedAt: new Date(now).toISOString(),
    weeks,
    totalCards: allCards.length,
    completedCount,
    overdueCount,
    doneColumnId,
    doneColumnTitle: doneColumn?.title ?? null,
    cardsByStatus,
    cardsByAssignee,
    cardsByPriority,
    throughput: buckets,
    cycleTime,
  };
}
