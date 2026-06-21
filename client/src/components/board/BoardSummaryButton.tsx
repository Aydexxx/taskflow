import { useState } from 'react';
import { api, ApiRequestError } from '../../lib/api';
import { useAiEnabled } from '../../lib/ai';
import { IconButton, Modal, Spinner } from '../ui';
import { SparklesIcon } from '../icons';

interface BoardSummaryButtonProps {
  boardId: string;
}

/**
 * "Summarize board" affordance. Renders nothing unless AI is enabled, so with
 * no provider configured there is no AI surface at all. The generated digest is
 * shown read-only in a modal — it never mutates the board.
 */
export function BoardSummaryButton({ boardId }: BoardSummaryButtonProps): JSX.Element | null {
  const aiEnabled = useAiEnabled();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!aiEnabled) return null;

  async function openAndSummarize(): Promise<void> {
    setOpen(true);
    setSummary(null);
    setError(null);
    setIsLoading(true);
    try {
      const result = await api.ai.summarizeBoard(boardId);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to summarize the board');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <IconButton onClick={() => void openAndSummarize()} aria-label="Summarize board with AI">
        <SparklesIcon className="h-4 w-4" />
      </IconButton>
      {open && (
        <Modal ariaLabel="Board summary" onClose={() => setOpen(false)} className="max-w-lg">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">AI board summary</h2>
          </div>
          <div className="mt-4 min-h-[6rem] text-sm text-slate-700 dark:text-slate-200">
            {isLoading && (
              <p className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <Spinner className="h-4 w-4" /> Generating summary…
              </p>
            )}
            {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
            {summary && <p className="whitespace-pre-wrap leading-relaxed">{summary}</p>}
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            AI-generated from current board data. Review before relying on it.
          </p>
        </Modal>
      )}
    </>
  );
}
