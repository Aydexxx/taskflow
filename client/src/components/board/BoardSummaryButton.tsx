import { useState, type FormEvent } from 'react';
import { api, ApiRequestError } from '../../lib/api';
import { useAiEnabled } from '../../lib/ai';
import { Button, IconButton, Modal, Spinner, Textarea } from '../ui';
import { SparklesIcon } from '../icons';

interface BoardSummaryButtonProps {
  boardId: string;
}

type Mode = 'summary' | 'ask';

/**
 * AI board assistant affordance. Renders nothing unless AI is enabled, so with
 * no provider configured there is no AI surface at all. Two read-only modes:
 * "Summary" generates a status digest of the board, and "Ask" answers a
 * free-form question grounded in the board's current state. Neither ever
 * mutates the board.
 */
export function BoardSummaryButton({ boardId }: BoardSummaryButtonProps): JSX.Element | null {
  const aiEnabled = useAiEnabled();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('summary');

  // Summary state.
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Ask state.
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  if (!aiEnabled) return null;

  /** Turn any thrown value into a friendly message, calling out rate limits. */
  function messageFor(err: unknown, fallback: string): string {
    if (err instanceof ApiRequestError) {
      if (err.status === 429) return "You're asking a bit fast — please wait a moment and try again.";
      return err.message;
    }
    return fallback;
  }

  async function runSummary(): Promise<void> {
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const result = await api.ai.summarizeBoard(boardId);
      setSummary(result.summary);
    } catch (err) {
      setSummaryError(messageFor(err, 'Failed to summarize the board'));
    } finally {
      setSummaryLoading(false);
    }
  }

  function openPanel(): void {
    setOpen(true);
    setMode('summary');
    void runSummary();
  }

  async function handleAsk(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || askLoading) return;
    setAnswer(null);
    setAskError(null);
    setAskLoading(true);
    try {
      const result = await api.ai.askBoard(boardId, { question: trimmed });
      setAnswer(result.answer);
    } catch (err) {
      setAskError(messageFor(err, 'Failed to answer your question'));
    } finally {
      setAskLoading(false);
    }
  }

  const tabClass = (active: boolean): string =>
    `rounded-md px-3 py-1 text-sm font-medium transition-colors ${
      active
        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  return (
    <>
      <IconButton onClick={openPanel} aria-label="AI board assistant">
        <SparklesIcon className="h-4 w-4" />
      </IconButton>
      {open && (
        <Modal ariaLabel="AI board assistant" onClose={() => setOpen(false)} className="max-w-lg">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">AI board assistant</h2>
          </div>

          <div
            role="tablist"
            aria-label="AI mode"
            className="mt-4 inline-flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'summary'}
              className={tabClass(mode === 'summary')}
              onClick={() => setMode('summary')}
            >
              Summary
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'ask'}
              className={tabClass(mode === 'ask')}
              onClick={() => setMode('ask')}
            >
              Ask
            </button>
          </div>

          {mode === 'summary' ? (
            <>
              <div className="mt-4 min-h-[6rem] text-sm text-slate-700 dark:text-slate-200">
                {summaryLoading && (
                  <p className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                    <Spinner className="h-4 w-4" /> Generating summary…
                  </p>
                )}
                {summaryError && <p className="text-red-600 dark:text-red-400">{summaryError}</p>}
                {summary && <p className="whitespace-pre-wrap leading-relaxed">{summary}</p>}
              </div>
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                AI-generated from current board data. Review before relying on it.
              </p>
            </>
          ) : (
            <>
              <form className="mt-4" onSubmit={(event) => void handleAsk(event)}>
                <Textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ask anything about this board — e.g. what's overdue, or who moved cards recently?"
                  aria-label="Question about this board"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={askLoading}
                    disabled={question.trim().length === 0 || askLoading}
                  >
                    Ask
                  </Button>
                </div>
              </form>

              <div className="mt-2 min-h-[4rem] text-sm text-slate-700 dark:text-slate-200">
                {askLoading && (
                  <p className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                    <Spinner className="h-4 w-4" /> Thinking…
                  </p>
                )}
                {askError && <p className="text-red-600 dark:text-red-400">{askError}</p>}
                {answer && !askLoading && <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>}
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Answers are AI-generated from current board data. Review before relying on them.
              </p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
