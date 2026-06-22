import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { BoardAnalytics } from '@taskflow/shared';
import { api, ApiRequestError } from '../lib/api';
import { AppHeader } from '../components/AppHeader';
import { AppPage } from '../components/AppPage';
import { PageHeader } from '../components/PageHeader';
import { Badge, Button, EmptyState, FieldLabel, Select, Spinner } from '../components/ui';
import { StatCard } from '../components/analytics/StatCard';
import { ChartCard } from '../components/analytics/ChartCard';
import {
  AssigneeBarChart,
  PriorityBarChart,
  StatusBarChart,
  ThroughputAreaChart,
} from '../components/analytics/charts';
import { PRIORITY_LABELS } from '../lib/board/priority';
import { cycleTimeSummary, formatDays, isBoardEmpty, topAssignees, totalThroughput } from '../lib/analytics';

const WEEK_OPTIONS = [4, 8, 12] as const;

export function BoardAnalyticsPage(): JSX.Element {
  const { boardId } = useParams<{ boardId: string }>();
  const [weeks, setWeeks] = useState<number>(8);
  const [reloadKey, setReloadKey] = useState(0);
  const [analytics, setAnalytics] = useState<BoardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    api.boards
      .analytics(boardId, weeks)
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boardId, weeks, reloadKey]);

  return (
    <AppPage
      header={
        <AppHeader
          title={analytics ? `${analytics.boardTitle} · Analytics` : 'Analytics'}
          backTo={boardId ? { to: `/boards/${boardId}`, label: 'Board' } : undefined}
        />
      }
    >
      <PageHeader
        eyebrow={<Badge tone="accent">Analytics</Badge>}
        title={analytics ? analytics.boardTitle : 'Board analytics'}
        subtitle="Status, throughput, and cycle-time at a glance — see where work piles up and how fast it ships."
      />
      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Spinner className="h-4 w-4" /> Loading analytics…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <p className="font-medium">{error}</p>
            {boardId && (
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setReloadKey((key) => key + 1)}>
                Retry
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && analytics && (
          <AnalyticsContent analytics={analytics} weeks={weeks} onWeeksChange={setWeeks} />
        )}
      </div>
    </AppPage>
  );
}

interface AnalyticsContentProps {
  analytics: BoardAnalytics;
  weeks: number;
  onWeeksChange: (weeks: number) => void;
}

function AnalyticsContent({ analytics, weeks, onWeeksChange }: AnalyticsContentProps): JSX.Element {
  if (isBoardEmpty(analytics)) {
    return (
      <EmptyState
        title="No data yet"
        description="Add cards to this board to see status, throughput, and cycle-time analytics."
      />
    );
  }

  const assignees = topAssignees(analytics.cardsByAssignee);
  const completedHint = analytics.doneColumnTitle ? `in "${analytics.doneColumnTitle}"` : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI tiles */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <StatCard label="Total cards" value={analytics.totalCards} />
        <StatCard label="Completed" value={analytics.completedCount} hint={completedHint} tone="positive" />
        <StatCard
          label="Overdue"
          value={analytics.overdueCount}
          tone={analytics.overdueCount > 0 ? 'warn' : 'default'}
          hint={analytics.overdueCount > 0 ? 'past due, not done' : 'all on track'}
        />
        <StatCard
          label="Avg cycle time"
          value={formatDays(analytics.cycleTime.averageDays)}
          hint={`median ${formatDays(analytics.cycleTime.medianDays)}`}
        />
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Cards by status"
          subtitle="Current distribution across columns"
          ariaSummary={`Cards by status. ${analytics.cardsByStatus
            .map((s) => `${s.columnTitle}: ${s.count}`)
            .join(', ')}.`}
          srTable={{
            caption: 'Cards by status',
            columns: ['Column', 'Cards'],
            rows: analytics.cardsByStatus.map((s) => [s.columnTitle, s.count]),
          }}
        >
          <StatusBarChart data={analytics.cardsByStatus} />
        </ChartCard>

        <ChartCard
          title="Cards by priority"
          subtitle="How urgent the work is"
          ariaSummary={`Cards by priority. ${analytics.cardsByPriority
            .map((p) => `${PRIORITY_LABELS[p.priority]}: ${p.count}`)
            .join(', ')}.`}
          srTable={{
            caption: 'Cards by priority',
            columns: ['Priority', 'Cards'],
            rows: analytics.cardsByPriority.map((p) => [PRIORITY_LABELS[p.priority], p.count]),
          }}
        >
          <PriorityBarChart data={analytics.cardsByPriority} />
        </ChartCard>

        <ChartCard
          title="Cards by assignee"
          subtitle="Workload across the team"
          ariaSummary={`Cards by assignee. ${assignees.map((a) => `${a.name}: ${a.count}`).join(', ')}.`}
          srTable={{
            caption: 'Cards by assignee',
            columns: ['Assignee', 'Cards'],
            rows: assignees.map((a) => [a.name, a.count]),
          }}
        >
          <AssigneeBarChart data={assignees} />
        </ChartCard>

        <ChartCard
          title="Throughput"
          subtitle={`Cards completed per week · ${totalThroughput(analytics)} in the last ${weeks} weeks`}
          ariaSummary={`Weekly throughput over the last ${weeks} weeks. ${analytics.throughput
            .map((w) => `${w.label}: ${w.completed}`)
            .join(', ')}.`}
          srTable={{
            caption: 'Cards completed per week',
            columns: ['Week of', 'Completed'],
            rows: analytics.throughput.map((w) => [w.label, w.completed]),
          }}
        >
          <ThroughputAreaChart data={analytics.throughput} />
        </ChartCard>
      </div>

      {/* Controls + context footer */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Cycle time {cycleTimeSummary(analytics.cycleTime)}. Completion is approximated as a card reaching the
          {analytics.doneColumnTitle ? ` "${analytics.doneColumnTitle}"` : ' last'} column.
        </p>
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor="weeks-range" className="mb-0 whitespace-nowrap">
            Throughput range
          </FieldLabel>
          <Select
            id="weeks-range"
            value={String(weeks)}
            onChange={(event) => onWeeksChange(Number(event.target.value))}
            className="w-auto"
          >
            {WEEK_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Last {option} weeks
              </option>
            ))}
          </Select>
        </div>
      </section>
    </div>
  );
}
