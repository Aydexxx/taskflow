import { useState } from 'react';
import type { Card, CardPriority, Label } from '@taskflow/shared';
import { api, ApiRequestError } from '../../lib/api';
import { useAiEnabled } from '../../lib/ai';
import { Button, Spinner } from '../ui';
import { SparklesIcon } from '../icons';
import { labelChipClass } from '../../lib/board/labelColors';
import { PRIORITY_LABELS } from '../../lib/board/priority';

interface CardAiAssistProps {
  workspaceId: string;
  /** Null while creating a card; only title-based drafting is available then. */
  card: Card | null;
  /** The card title currently typed into the form (drafting needs at least this). */
  title: string;
  description: string;
  workspaceLabels: Label[];
  onDescriptionChange: (text: string) => void;
  onPriorityChange: (priority: CardPriority) => void;
  onCardUpdated: (card: Card) => void;
  onWorkspaceLabelsChange: (labels: Label[]) => void;
}

const SECTION_CLASS = 'mt-6 border-t border-slate-200 pt-4 dark:border-slate-700';

/**
 * AI assist block inside the card editor. Renders nothing unless AI is enabled,
 * so with no provider configured the card editor is unchanged. Every result is
 * a draft/suggestion the user explicitly accepts — applying a description,
 * priority, or label goes through the normal (separately authorized) flows and
 * nothing is persisted until the user saves.
 */
export function CardAiAssist({
  workspaceId,
  card,
  title,
  description,
  workspaceLabels,
  onDescriptionChange,
  onPriorityChange,
  onCardUpdated,
  onWorkspaceLabelsChange,
}: CardAiAssistProps): JSX.Element | null {
  const aiEnabled = useAiEnabled();

  const [busy, setBusy] = useState<null | 'description' | 'subtasks' | 'metadata'>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<{ text: string; checked: boolean }[] | null>(null);
  const [suggestedLabels, setSuggestedLabels] = useState<string[] | null>(null);
  const [suggestedPriority, setSuggestedPriority] = useState<CardPriority | null>(null);
  const [suggestionReason, setSuggestionReason] = useState<string | undefined>(undefined);

  if (!aiEnabled) return null;

  const hasTitle = title.trim().length > 0;

  function describeError(err: unknown, fallback: string): string {
    return err instanceof ApiRequestError ? err.message : fallback;
  }

  async function handleDraftDescription(): Promise<void> {
    setBusy('description');
    setError(null);
    try {
      const result = await api.ai.draftDescription(workspaceId, { title: title.trim() });
      setDraft(result.description);
    } catch (err) {
      setError(describeError(err, 'Failed to draft a description'));
    } finally {
      setBusy(null);
    }
  }

  async function handleSuggestSubtasks(): Promise<void> {
    if (!card) return;
    setBusy('subtasks');
    setError(null);
    try {
      const result = await api.ai.suggestSubtasks(card.id);
      setSubtasks(result.subtasks.map((text) => ({ text, checked: true })));
    } catch (err) {
      setError(describeError(err, 'Failed to suggest subtasks'));
    } finally {
      setBusy(null);
    }
  }

  async function handleSuggestMetadata(): Promise<void> {
    if (!card) return;
    setBusy('metadata');
    setError(null);
    try {
      const result = await api.ai.suggestMetadata(card.id);
      setSuggestedLabels(result.labels);
      setSuggestedPriority(result.priority);
      setSuggestionReason(result.reason);
    } catch (err) {
      setError(describeError(err, 'Failed to suggest labels and priority'));
    } finally {
      setBusy(null);
    }
  }

  function applyDraft(): void {
    if (draft === null) return;
    onDescriptionChange(draft);
    setDraft(null);
  }

  function appendSubtasks(): void {
    if (!subtasks) return;
    const accepted = subtasks.filter((item) => item.checked && item.text.trim());
    if (accepted.length === 0) return;
    const checklist = accepted.map((item) => `- [ ] ${item.text.trim()}`).join('\n');
    onDescriptionChange(description.trim() ? `${description.trim()}\n\n${checklist}` : checklist);
    setSubtasks(null);
  }

  /** Attach a suggested label: reuse an existing workspace label or create one. */
  async function applyLabel(name: string): Promise<void> {
    if (!card) return;
    setError(null);
    try {
      const existing = workspaceLabels.find((label) => label.name.toLowerCase() === name.toLowerCase());
      const label = existing ?? (await api.workspaces.createLabel(workspaceId, { name, color: 'gray' }));
      if (!existing) onWorkspaceLabelsChange([...workspaceLabels, label]);
      onCardUpdated(await api.cards.addLabel(card.id, { labelId: label.id }));
      setSuggestedLabels((current) => current?.filter((l) => l.toLowerCase() !== name.toLowerCase()) ?? null);
    } catch (err) {
      setError(describeError(err, 'Failed to apply label'));
    }
  }

  return (
    <div className={SECTION_CLASS}>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <SparklesIcon className="h-4 w-4 text-indigo-500" />
        AI assist
      </h3>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void handleDraftDescription()}
          isLoading={busy === 'description'}
          disabled={!hasTitle || busy !== null}
        >
          Draft description
        </Button>
        {card && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleSuggestSubtasks()}
              isLoading={busy === 'subtasks'}
              disabled={busy !== null}
            >
              Break into subtasks
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleSuggestMetadata()}
              isLoading={busy === 'metadata'}
              disabled={busy !== null}
            >
              Suggest labels &amp; priority
            </Button>
          </>
        )}
      </div>

      {!hasTitle && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Add a title to draft a description.</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {busy && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Spinner className="h-3.5 w-3.5" /> Thinking…
        </p>
      )}

      {/* Description draft — shown for review before it replaces the field. */}
      {draft !== null && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Suggested description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{draft}</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" onClick={applyDraft}>
              Use as description
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Subtasks — editable checklist the user accepts before it's appended. */}
      {subtasks !== null && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Suggested subtasks (edit, then accept)</p>
          {subtasks.length === 0 && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">No subtasks suggested.</p>
          )}
          <ul className="mt-2 flex flex-col gap-1.5">
            {subtasks.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) =>
                    setSubtasks((current) =>
                      current?.map((s, i) => (i === index ? { ...s, checked: event.target.checked } : s)) ?? current,
                    )
                  }
                  aria-label={`Include subtask: ${item.text}`}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <input
                  value={item.text}
                  onChange={(event) =>
                    setSubtasks((current) =>
                      current?.map((s, i) => (i === index ? { ...s, text: event.target.value } : s)) ?? current,
                    )
                  }
                  aria-label={`Subtask ${index + 1}`}
                  className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={appendSubtasks}
              disabled={!subtasks.some((item) => item.checked && item.text.trim())}
            >
              Add to description
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSubtasks(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Label / priority suggestions — applied only on explicit click. */}
      {suggestedLabels !== null && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Suggestions</p>
          {suggestionReason && (
            <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{suggestionReason}</p>
          )}
          {suggestedPriority && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Priority:</span>
              <Button type="button" variant="secondary" size="sm" onClick={() => onPriorityChange(suggestedPriority)}>
                Set {PRIORITY_LABELS[suggestedPriority]}
              </Button>
            </div>
          )}
          {suggestedLabels.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Labels:</span>
              {suggestedLabels.map((name) => {
                const existing = workspaceLabels.find((label) => label.name.toLowerCase() === name.toLowerCase());
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => void applyLabel(name)}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${labelChipClass(
                      existing?.color ?? 'gray',
                    )} hover:opacity-80`}
                    aria-label={`Add label ${name}`}
                  >
                    + {name}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSuggestedLabels(null);
                setSuggestedPriority(null);
                setSuggestionReason(undefined);
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
