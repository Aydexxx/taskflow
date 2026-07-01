import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { api, ApiRequestError } from '../../lib/api';
import { useAiEnabled } from '../../lib/ai';
import { Button, IconButton, Spinner, Textarea } from '../ui';
import { SparklesIcon, XIcon } from '../icons';

interface WorkspaceAiAssistantProps {
  workspaceId: string;
}

/** One question/answer exchange rendered in the conversation area. */
interface Exchange {
  question: string;
  answer: string | null;
  error: string | null;
}

const PLACEHOLDER =
  'Ask anything about this workspace — e.g. "Who works in this workspace?", "What did each member do recently?", ' +
  '"Which boards have the most overdue cards?"';

/**
 * Workspace-level AI assistant: a labeled trigger plus a right-hand drawer that
 * answers free-form questions about the whole workspace (members, boards, and
 * recent activity). Renders nothing when AI is disabled, so with no provider
 * configured there is no trigger at all. Read-only Q&A — it never mutates data.
 */
export function WorkspaceAiAssistant({ workspaceId }: WorkspaceAiAssistantProps): JSX.Element | null {
  const aiEnabled = useAiEnabled();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close on Escape and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Keep the newest exchange in view as answers stream in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [exchanges, isLoading]);

  if (!aiEnabled) return null;

  /** Turn any thrown value into a friendly message, calling out rate limits. */
  function messageFor(err: unknown): string {
    if (err instanceof ApiRequestError) {
      if (err.status === 429) return "You're asking a bit fast — please wait a moment and try again.";
      return err.message;
    }
    return 'Failed to answer your question';
  }

  async function handleAsk(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const index = exchanges.length;
    setExchanges((current) => [...current, { question: trimmed, answer: null, error: null }]);
    setQuestion('');
    setIsLoading(true);
    try {
      const result = await api.ai.askWorkspace(workspaceId, { question: trimmed });
      setExchanges((current) =>
        current.map((exchange, i) => (i === index ? { ...exchange, answer: result.answer } : exchange)),
      );
    } catch (err) {
      const message = messageFor(err);
      setExchanges((current) =>
        current.map((exchange, i) => (i === index ? { ...exchange, error: message } : exchange)),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <SparklesIcon className="h-4 w-4 text-indigo-500" />
        Ask AI
      </Button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 animate-fade-in backdrop-blur-sm dark:bg-slate-950/70"
            onClick={() => setOpen(false)}
          >
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Workspace AI assistant"
              onClick={(event) => event.stopPropagation()}
              className="flex h-full w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-overlay ring-1 ring-slate-900/5 motion-safe:animate-slide-in-right dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10"
            >
              <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">AI assistant</h2>
                </div>
                <IconButton onClick={() => setOpen(false)} aria-label="Close AI assistant">
                  <XIcon className="h-4 w-4" />
                </IconButton>
              </header>

              <div ref={scrollRef} className="scrollbar-subtle flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {exchanges.length === 0 && !isLoading && (
                  <p className="text-sm leading-relaxed text-slate-400 dark:text-slate-500">
                    Ask about members, boards, or recent activity across this workspace. Answers are grounded in the
                    workspace&apos;s current data.
                  </p>
                )}

                {exchanges.map((exchange, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm leading-relaxed text-white">
                        {exchange.question}
                      </p>
                    </div>
                    {exchange.answer !== null && (
                      <div className="flex justify-start">
                        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {exchange.answer}
                        </p>
                      </div>
                    )}
                    {exchange.error !== null && (
                      <div className="flex justify-start">
                        <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-600 dark:bg-red-500/10 dark:text-red-400">
                          {exchange.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <p className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                    <Spinner className="h-4 w-4" /> Thinking…
                  </p>
                )}
              </div>

              <form
                onSubmit={(event) => void handleAsk(event)}
                className="border-t border-slate-200 px-5 py-4 dark:border-slate-800"
              >
                <Textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={PLACEHOLDER}
                  aria-label="Question about this workspace"
                  onKeyDown={(event) => {
                    // Enter submits; Shift+Enter inserts a newline.
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleAsk(event);
                    }
                  }}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isLoading}
                    disabled={question.trim().length === 0 || isLoading}
                  >
                    Ask
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  AI-generated from current workspace data. Review before relying on it.
                </p>
              </form>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
