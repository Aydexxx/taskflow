import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { getEnabled, setEnabled } = vi.hoisted(() => {
  let enabled = false;
  return {
    getEnabled: () => enabled,
    setEnabled: (next: boolean) => {
      enabled = next;
    },
  };
});

vi.mock('../../lib/ai', () => ({ useAiEnabled: () => getEnabled() }));

const summarizeBoardMock = vi.fn();
vi.mock('../../lib/api', () => ({
  api: { ai: { summarizeBoard: (boardId: string) => summarizeBoardMock(boardId) } },
  ApiRequestError: class ApiRequestError extends Error {},
}));

import { BoardSummaryButton } from './BoardSummaryButton';

afterEach(() => {
  summarizeBoardMock.mockReset();
  setEnabled(false);
});

describe('BoardSummaryButton', () => {
  it('renders nothing when AI is disabled', () => {
    setEnabled(false);
    const { container } = render(<BoardSummaryButton boardId="board-1" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /ai board assistant/i })).not.toBeInTheDocument();
  });

  it('shows the button and renders a fetched summary when AI is enabled', async () => {
    setEnabled(true);
    summarizeBoardMock.mockResolvedValue({ summary: 'Two cards in progress, none overdue.' });

    render(<BoardSummaryButton boardId="board-1" />);
    const button = screen.getByRole('button', { name: /ai board assistant/i });
    fireEvent.click(button);

    expect(summarizeBoardMock).toHaveBeenCalledWith('board-1');
    await waitFor(() => expect(screen.getByText('Two cards in progress, none overdue.')).toBeInTheDocument());
  });

  it('shows an error message when summarization fails', async () => {
    setEnabled(true);
    summarizeBoardMock.mockRejectedValue(new Error('boom'));

    render(<BoardSummaryButton boardId="board-1" />);
    fireEvent.click(screen.getByRole('button', { name: /ai board assistant/i }));

    await waitFor(() => expect(screen.getByText(/failed to summarize/i)).toBeInTheDocument());
  });
});
