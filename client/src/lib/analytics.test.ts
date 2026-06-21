import { describe, expect, it } from 'vitest';
import type { BoardAnalytics, CycleTimeSummary } from '@taskflow/shared';
import {
  categoricalColor,
  chartTheme,
  cycleTimeSummary,
  formatDays,
  isBoardEmpty,
  PRIORITY_CHART_COLOR,
  statusSummary,
  topAssignees,
  totalThroughput,
} from './analytics';

function makeAnalytics(overrides: Partial<BoardAnalytics> = {}): BoardAnalytics {
  return {
    boardId: 'b1',
    boardTitle: 'Board',
    generatedAt: new Date().toISOString(),
    weeks: 8,
    totalCards: 3,
    completedCount: 1,
    overdueCount: 1,
    doneColumnId: 'c3',
    doneColumnTitle: 'Done',
    cardsByStatus: [
      { columnId: 'c1', columnTitle: 'To Do', count: 1 },
      { columnId: 'c3', columnTitle: 'Done', count: 1 },
    ],
    cardsByAssignee: [{ assigneeId: null, name: 'Unassigned', count: 3 }],
    cardsByPriority: [
      { priority: 'LOW', count: 1 },
      { priority: 'MEDIUM', count: 0 },
      { priority: 'HIGH', count: 1 },
      { priority: 'URGENT', count: 1 },
    ],
    throughput: [
      { weekStart: '2026-06-01T00:00:00.000Z', label: 'Jun 1', completed: 0 },
      { weekStart: '2026-06-08T00:00:00.000Z', label: 'Jun 8', completed: 1 },
    ],
    cycleTime: { averageDays: 2.5, medianDays: 2, sampleSize: 1 },
    ...overrides,
  };
}

describe('formatDays', () => {
  it('renders a dash when null', () => {
    expect(formatDays(null)).toBe('—');
  });

  it('pluralizes correctly and handles sub-day values', () => {
    expect(formatDays(0.5)).toBe('< 1 day');
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(3.5)).toBe('3.5 days');
  });
});

describe('cycleTimeSummary', () => {
  it('explains the no-data case', () => {
    const empty: CycleTimeSummary = { averageDays: null, medianDays: null, sampleSize: 0 };
    expect(cycleTimeSummary(empty)).toBe('No completed cards yet');
  });

  it('summarizes average, median and sample size', () => {
    expect(cycleTimeSummary({ averageDays: 2.5, medianDays: 2, sampleSize: 3 })).toBe(
      'Avg 2.5 days · median 2 days across 3 cards',
    );
  });
});

describe('aggregate helpers', () => {
  it('sums throughput across weeks', () => {
    expect(totalThroughput(makeAnalytics())).toBe(1);
  });

  it('detects an empty board', () => {
    expect(isBoardEmpty(makeAnalytics({ totalCards: 0 }))).toBe(true);
    expect(isBoardEmpty(makeAnalytics({ totalCards: 5 }))).toBe(false);
  });

  it('limits assignees to the requested maximum', () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ assigneeId: `u${i}`, name: `User ${i}`, count: 12 - i }));
    expect(topAssignees(data, 5)).toHaveLength(5);
    expect(topAssignees(data, 5)[0]?.name).toBe('User 0');
  });

  it('summarizes status distribution as plain text', () => {
    expect(statusSummary(makeAnalytics())).toBe('To Do: 1, Done: 1');
  });
});

describe('theme + palette', () => {
  it('returns distinct axis colors per theme', () => {
    expect(chartTheme('light').axis).not.toBe(chartTheme('dark').axis);
  });

  it('maps every priority to a fixed color', () => {
    expect(PRIORITY_CHART_COLOR.URGENT).toBe('#ef4444');
    expect(PRIORITY_CHART_COLOR.LOW).toBeTypeOf('string');
  });

  it('cycles categorical colors by index', () => {
    expect(categoricalColor(0)).toBe(categoricalColor(8));
  });
});
