import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { BoardAnalytics } from '@taskflow/shared';

vi.mock('react-router-dom', () => ({ useParams: () => ({ boardId: 'b1' }) }));

// AppHeader pulls in auth/notifications/theme context we don't need here.
vi.mock('../components/AppHeader', () => ({ AppHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));

// recharts is SVG/measurement-heavy and pointless in jsdom; assert on the
// accessible data tables ChartCard renders instead.
vi.mock('../components/analytics/charts', () => ({
  StatusBarChart: () => <div data-testid="status-chart" />,
  PriorityBarChart: () => <div data-testid="priority-chart" />,
  AssigneeBarChart: () => <div data-testid="assignee-chart" />,
  ThroughputAreaChart: () => <div data-testid="throughput-chart" />,
}));

const { analyticsMock, ApiRequestError } = vi.hoisted(() => {
  class ApiRequestError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { analyticsMock: vi.fn(), ApiRequestError };
});
vi.mock('../lib/api', () => ({
  api: { boards: { analytics: (boardId: string, weeks?: number) => analyticsMock(boardId, weeks) } },
  ApiRequestError,
}));

import { BoardAnalyticsPage } from './BoardAnalyticsPage';

function makeAnalytics(overrides: Partial<BoardAnalytics> = {}): BoardAnalytics {
  return {
    boardId: 'b1',
    boardTitle: 'Sprint Board',
    generatedAt: new Date().toISOString(),
    weeks: 8,
    totalCards: 4,
    completedCount: 1,
    overdueCount: 2,
    doneColumnId: 'c3',
    doneColumnTitle: 'Done',
    cardsByStatus: [
      { columnId: 'c1', columnTitle: 'To Do', count: 2 },
      { columnId: 'c2', columnTitle: 'In Progress', count: 1 },
      { columnId: 'c3', columnTitle: 'Done', count: 1 },
    ],
    cardsByAssignee: [
      { assigneeId: 'u1', name: 'Ada', count: 2 },
      { assigneeId: null, name: 'Unassigned', count: 2 },
    ],
    cardsByPriority: [
      { priority: 'LOW', count: 1 },
      { priority: 'MEDIUM', count: 1 },
      { priority: 'HIGH', count: 1 },
      { priority: 'URGENT', count: 1 },
    ],
    throughput: [
      { weekStart: '2026-06-08T00:00:00.000Z', label: 'Jun 8', completed: 1 },
      { weekStart: '2026-06-15T00:00:00.000Z', label: 'Jun 15', completed: 0 },
    ],
    cycleTime: { averageDays: 3, medianDays: 2, sampleSize: 1 },
    ...overrides,
  };
}

afterEach(() => {
  analyticsMock.mockReset();
});

describe('BoardAnalyticsPage', () => {
  it('shows a loading state then renders KPI tiles and chart data tables', async () => {
    analyticsMock.mockResolvedValue(makeAnalytics());
    render(<BoardAnalyticsPage />);

    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Cards by status' })).toBeInTheDocument());

    // KPI tiles
    expect(screen.getByText('Total cards')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    // Accessible data table mirrors the chart (status distribution).
    const statusTable = screen.getByRole('table', { name: 'Cards by status' });
    expect(within(statusTable).getByRole('row', { name: /To Do 2/ })).toBeInTheDocument();
    expect(within(statusTable).getByRole('row', { name: /Done 1/ })).toBeInTheDocument();

    expect(analyticsMock).toHaveBeenCalledWith('b1', 8);
  });

  it('renders an empty state when the board has no cards', async () => {
    analyticsMock.mockResolvedValue(makeAnalytics({ totalCards: 0 }));
    render(<BoardAnalyticsPage />);

    await waitFor(() => expect(screen.getByText('No data yet')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Cards by status' })).not.toBeInTheDocument();
  });

  it('surfaces an error message when the request fails', async () => {
    analyticsMock.mockRejectedValue(new ApiRequestError('You are not a member of this workspace', 403));
    render(<BoardAnalyticsPage />);

    await waitFor(() =>
      expect(screen.getByText('You are not a member of this workspace')).toBeInTheDocument(),
    );
  });
});
