import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { ChatMessage } from '@taskflow/shared';
import { api, ApiRequestError } from '../../lib/api';
import { useAiEnabled } from '../../lib/ai';
import { Button, IconButton, Spinner, Textarea } from '../ui';
import { SparklesIcon, XIcon } from '../icons';

const PLACEHOLDER = 'Ask anything about your workspaces, boards, and team…';

/**
 * The most recent turns we resend as `history`, bounding the token cost of long
 * conversations. One turn is a user/assistant pair, so ~8 turns is 16 messages.
 * The server caps this too; we mirror it client-side to avoid oversized requests.
 */
const MAX_HISTORY_MESSAGES = 16;

/** Prompts shown in the empty state to seed a first question. */
const EXAMPLE_PROMPTS = [
  'Who works in my workspaces?',
  'What did my team do recently?',
  'Which board has the most overdue cards?',
];

/**
 * Global conversational AI assistant: a floating launcher (bottom-left) that
 * opens a multi-turn chat panel spanning everything the signed-in user can
 * access. Renders nothing when AI is disabled, so with no provider configured
 * there is no launcher at all. Read-only Q&A — it never mutates data.
 *
 * The conversation lives in React state for the session only (no persistence).
 */
export function AssistantWidget(): JSX.Element | null {
  const aiEnabled = useAiEnabled();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close on Escape while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, error]);

  if (!aiEnabled) return null;

  /** Turn any thrown value into a friendly message, calling out rate limits. */
  function messageFor(err: unknown): string {
    if (err instanceof ApiRequestError) {
      if (err.status === 429) return "You're asking a bit fast — please wait a moment and try again.";
      return err.message;
    }
    return 'Failed to answer your question';
  }

  async function ask(rawQuestion: string): Promise<void> {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isLoading) return;

    // Prior turns become the history payload; the new question is sent separately.
    const history = messages.slice(-MAX_HISTORY_MESSAGES);
    setMessages((current) => [...current, { role: 'user', content: trimmed }]);
    setQuestion('');
    setError(null);
    setIsLoading(true);
    try {
      const result = await api.ai.askAssistant(trimmed, history);
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }]);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void ask(question);
  }

  return (
    <>
      {/* Floating launcher — fixed to the bottom-left, above page content. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
        className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-overlay ring-1 ring-indigo-500/30 transition duration-150 ease-out-soft hover:bg-indigo-500 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-95 dark:ring-white/10 dark:focus-visible:ring-offset-slate-950"
      >
        {open ? <XIcon className="h-5 w-5" /> : <SparklesIcon className="h-6 w-6" />}
      </button>

      {open &&
        createPortal(
          <section
            role="dialog"
            aria-modal="false"
            aria-label="AI assistant"
            className="fixed inset-x-4 bottom-4 top-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-overlay ring-1 ring-slate-900/5 motion-safe:animate-scale-in sm:inset-x-auto sm:bottom-24 sm:left-6 sm:top-auto sm:h-[min(70vh,600px)] sm:w-[400px] dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10"
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
              {messages.length === 0 && !isLoading && !error && (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-slate-400 dark:text-slate-500">
                    Ask about members, boards, or recent activity across all of your workspaces. Answers are grounded
                    in your current data.
                  </p>
                  <div className="flex flex-col gap-2">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void ask(prompt)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-indigo-200 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) =>
                message.role === 'user' ? (
                  <div key={index} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm leading-relaxed text-white">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <div key={index} className="flex justify-start">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {message.content}
                    </p>
                  </div>
                ),
              )}

              {isLoading && (
                <p className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                  <Spinner className="h-4 w-4" /> Thinking…
                </p>
              )}

              {error !== null && (
                <div className="flex justify-start">
                  <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-slate-200 px-5 py-4 dark:border-slate-800"
            >
              <Textarea
                autoFocus
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder={PLACEHOLDER}
                aria-label="Ask the AI assistant"
                onKeyDown={(event) => {
                  // Enter submits; Shift+Enter inserts a newline.
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void ask(question);
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
                  Send
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                AI-generated from your current data. Review before relying on it.
              </p>
            </form>
          </section>,
          document.body,
        )}
    </>
  );
}
