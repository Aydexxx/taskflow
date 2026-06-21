import type { AssigneeDatum, BoardAnalytics, CardPriority, CycleTimeSummary } from '@taskflow/shared';
import type { Theme } from '../context/ThemeContext';

/**
 * Pure helpers for the analytics dashboard: theme-aware chart palettes and
 * presentational formatting. Kept free of React/recharts so the data shaping is
 * unit-testable in isolation from the (jsdom-awkward) SVG charts.
 */

/** Axis/grid/tooltip colors chosen per theme so charts stay legible in both. */
export interface ChartTheme {
  axis: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export function chartTheme(theme: Theme): ChartTheme {
  return theme === 'dark'
    ? { axis: '#94a3b8', grid: '#1e293b', tooltipBg: '#0f172a', tooltipBorder: '#334155', tooltipText: '#e2e8f0' }
    : { axis: '#64748b', grid: '#e2e8f0', tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0', tooltipText: '#0f172a' };
}

/** Fixed, color-blind-friendly hues per priority, consistent across themes. */
export const PRIORITY_CHART_COLOR: Record<CardPriority, string> = {
  LOW: '#94a3b8', // slate
  MEDIUM: '#3b82f6', // blue
  HIGH: '#f59e0b', // amber
  URGENT: '#ef4444', // red
};

/** A small categorical palette for per-assignee bars (cycles if exceeded). */
export const CATEGORICAL_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f43f5e',
] as const;

export function categoricalColor(index: number): string {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] as string;
}

/** Human-readable cycle time, e.g. "3.5 days" or "—" when there is no data. */
export function formatDays(days: number | null): string {
  if (days === null) return '—';
  if (days < 1) return '< 1 day';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** One-line summary of cycle time for KPI tiles and screen readers. */
export function cycleTimeSummary(cycle: CycleTimeSummary): string {
  if (cycle.sampleSize === 0) return 'No completed cards yet';
  return `Avg ${formatDays(cycle.averageDays)} · median ${formatDays(cycle.medianDays)} across ${cycle.sampleSize} card${
    cycle.sampleSize === 1 ? '' : 's'
  }`;
}

/** Total completed across all throughput buckets. */
export function totalThroughput(analytics: Pick<BoardAnalytics, 'throughput'>): number {
  return analytics.throughput.reduce((sum, week) => sum + week.completed, 0);
}

/** True when the board has no cards at all (drives the dashboard empty state). */
export function isBoardEmpty(analytics: BoardAnalytics): boolean {
  return analytics.totalCards === 0;
}

/** Assignee data limited to the top `max` buckets, preserving the server's sort. */
export function topAssignees(data: AssigneeDatum[], max = 8): AssigneeDatum[] {
  return data.slice(0, max);
}

/** Plain-text data summary for a chart's accessible description / sr-only table. */
export function statusSummary(analytics: Pick<BoardAnalytics, 'cardsByStatus'>): string {
  if (analytics.cardsByStatus.length === 0) return 'No columns on this board.';
  return analytics.cardsByStatus.map((status) => `${status.columnTitle}: ${status.count}`).join(', ');
}
