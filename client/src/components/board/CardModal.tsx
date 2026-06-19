import { useEffect, useState, type FormEvent } from 'react';
import type {
  Card,
  CardPriority,
  CommentDeletedEvent,
  CommentEvent,
  CommentWithAuthor,
  Label,
  LabelColor,
  WorkspaceMemberWithUser,
} from '@taskflow/shared';
import { CARD_PRIORITIES, LABEL_COLORS, SOCKET_EVENTS } from '@taskflow/shared';
import { api, ApiRequestError } from '../../lib/api';
import { socket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../Avatar';
import { TrashIcon, XIcon } from '../icons';
import { Button, FieldLabel, Input, Modal, Select, Spinner, Textarea } from '../ui';
import { labelChipClass, labelSwatchClass } from '../../lib/board/labelColors';
import { PRIORITY_LABELS } from '../../lib/board/priority';

export interface CardFormValues {
  title: string;
  description: string;
  assigneeId: string;
  priority: CardPriority;
  dueDate: string;
}

interface CardModalProps {
  /** Null when creating a new card; the existing card when editing. */
  card: Card | null;
  members: WorkspaceMemberWithUser[];
  workspaceId: string;
  onClose: () => void;
  onSubmit: (values: CardFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  /** Called after a label add/remove so the board's local card list updates immediately (the realtime broadcast that follows is an idempotent echo). */
  onCardUpdated: (card: Card) => void;
}

function toDateInputValue(isoDate: string | null): string {
  return isoDate ? isoDate.slice(0, 10) : '';
}

const SECTION_CLASS = 'mt-6 border-t border-slate-200 pt-4 dark:border-slate-700';
const SECTION_TITLE_CLASS = 'text-sm font-semibold text-slate-700 dark:text-slate-200';

export function CardModal({
  card,
  members,
  workspaceId,
  onClose,
  onSubmit,
  onDelete,
  onCardUpdated,
}: CardModalProps): JSX.Element {
  const { user } = useAuth();
  const [title, setTitle] = useState(card?.title ?? '');
  const [description, setDescription] = useState(card?.description ?? '');
  const [assigneeId, setAssigneeId] = useState(card?.assigneeId ?? '');
  const [priority, setPriority] = useState<CardPriority>(card?.priority ?? 'MEDIUM');
  const [dueDate, setDueDate] = useState(toDateInputValue(card?.dueDate ?? null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Labels: the workspace's full catalog, fetched once so the "add label" picker
  // can offer everything not already attached to this card.
  const [workspaceLabels, setWorkspaceLabels] = useState<Label[]>([]);
  const [isLabelBusy, setIsLabelBusy] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<LabelColor>('gray');

  useEffect(() => {
    api.workspaces
      .listLabels(workspaceId)
      .then(setWorkspaceLabels)
      .catch(() => {
        /* the "add label" picker just stays empty */
      });
  }, [workspaceId]);

  // Comments: not part of the Card snapshot (unbounded, paginated separately), so
  // they're loaded on demand here and kept live via a direct socket subscription
  // scoped to this card, independent of the board-wide column/card reducer.
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (!card) return undefined;
    const cardId = card.id;
    setComments([]);
    setCommentsLoading(true);
    api.cards
      .listComments(cardId)
      .then(setComments)
      .catch(() => {
        /* live updates and a retry-by-reopen cover this */
      })
      .finally(() => setCommentsLoading(false));

    const onCommentCreated = (payload: CommentEvent): void => {
      if (payload.cardId !== cardId) return;
      setComments((current) =>
        current.some((comment) => comment.id === payload.comment.id) ? current : [...current, payload.comment],
      );
    };
    const onCommentDeleted = (payload: CommentDeletedEvent): void => {
      if (payload.cardId !== cardId) return;
      setComments((current) => current.filter((comment) => comment.id !== payload.commentId));
    };
    socket.on(SOCKET_EVENTS.COMMENT_CREATED, onCommentCreated);
    socket.on(SOCKET_EVENTS.COMMENT_DELETED, onCommentDeleted);
    return () => {
      socket.off(SOCKET_EVENTS.COMMENT_CREATED, onCommentCreated);
      socket.off(SOCKET_EVENTS.COMMENT_DELETED, onCommentDeleted);
    };
  }, [card?.id]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title: trimmedTitle, description: description.trim(), assigneeId, priority, dueDate });
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save card');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!onDelete) return;
    if (!window.confirm('Delete this card? This cannot be undone.')) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to delete card');
      setIsDeleting(false);
    }
  }

  async function handleAddLabel(labelId: string): Promise<void> {
    if (!card || !labelId) return;
    setIsLabelBusy(true);
    setLabelError(null);
    try {
      onCardUpdated(await api.cards.addLabel(card.id, { labelId }));
    } catch (err) {
      setLabelError(err instanceof ApiRequestError ? err.message : 'Failed to add label');
    } finally {
      setIsLabelBusy(false);
    }
  }

  async function handleRemoveLabel(labelId: string): Promise<void> {
    if (!card) return;
    setIsLabelBusy(true);
    setLabelError(null);
    try {
      onCardUpdated(await api.cards.removeLabel(card.id, labelId));
    } catch (err) {
      setLabelError(err instanceof ApiRequestError ? err.message : 'Failed to remove label');
    } finally {
      setIsLabelBusy(false);
    }
  }

  async function handleCreateLabel(event: FormEvent): Promise<void> {
    event.preventDefault();
    const name = newLabelName.trim();
    if (!name || !card) return;

    setIsLabelBusy(true);
    setLabelError(null);
    try {
      const label = await api.workspaces.createLabel(workspaceId, { name, color: newLabelColor });
      setWorkspaceLabels((current) => [...current, label]);
      setNewLabelName('');
      setIsCreatingLabel(false);
      onCardUpdated(await api.cards.addLabel(card.id, { labelId: label.id }));
    } catch (err) {
      setLabelError(err instanceof ApiRequestError ? err.message : 'Failed to create label');
    } finally {
      setIsLabelBusy(false);
    }
  }

  async function handleAddComment(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!card) return;
    const body = newComment.trim();
    if (!body) return;

    setIsPostingComment(true);
    setCommentError(null);
    try {
      const comment = await api.cards.addComment(card.id, { body });
      setComments((current) => (current.some((c) => c.id === comment.id) ? current : [...current, comment]));
      setNewComment('');
    } catch (err) {
      setCommentError(err instanceof ApiRequestError ? err.message : 'Failed to add comment');
    } finally {
      setIsPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string): Promise<void> {
    setDeletingCommentId(commentId);
    setCommentError(null);
    try {
      await api.cards.deleteComment(commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (err) {
      setCommentError(err instanceof ApiRequestError ? err.message : 'Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  }

  const unattachedLabels = card ? workspaceLabels.filter((label) => !card.labels.some((l) => l.id === label.id)) : [];

  return (
    <Modal ariaLabel={card ? 'Edit card' : 'Create card'} onClose={onClose} className="max-w-2xl">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">{card ? 'Edit card' : 'New card'}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FieldLabel htmlFor="card-title">Title</FieldLabel>
          <Input
            id="card-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <FieldLabel htmlFor="card-description">Description</FieldLabel>
          <Textarea
            id="card-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor="card-assignee">Assignee</FieldLabel>
            <Select
              id="card-assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="mt-1"
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="card-priority">Priority</FieldLabel>
            <Select
              id="card-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as CardPriority)}
              className="mt-1"
            >
              {CARD_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="card-due-date">Due date</FieldLabel>
            <Input
              id="card-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-2 flex items-center justify-between">
          <div>
            {card && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
              >
                {isDeleting ? 'Deleting…' : 'Delete card'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={!title.trim()}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </form>

      {card && (
        <div className={SECTION_CLASS}>
          <h3 className={SECTION_TITLE_CLASS}>Labels</h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {card.labels.map((label) => (
              <span
                key={label.id}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${labelChipClass(label.color)}`}
              >
                {label.name}
                <button
                  type="button"
                  onClick={() => handleRemoveLabel(label.id)}
                  disabled={isLabelBusy}
                  aria-label={`Remove label ${label.name}`}
                  className="hover:opacity-70 disabled:opacity-50"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            {unattachedLabels.length > 0 && (
              <select
                value=""
                disabled={isLabelBusy}
                onChange={(event) => {
                  if (event.target.value) void handleAddLabel(event.target.value);
                }}
                aria-label="Add an existing label"
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="">+ Add label</option>
                {unattachedLabels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setIsCreatingLabel((current) => !current)}
              className="rounded border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              + New label
            </button>
          </div>

          {isCreatingLabel && (
            <form onSubmit={handleCreateLabel} className="mt-2 flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                placeholder="Label name"
                aria-label="New label name"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <div className="flex gap-1">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewLabelColor(color)}
                    aria-label={`Color ${color}`}
                    className={`h-5 w-5 rounded-full ${labelSwatchClass(color)} ${
                      newLabelColor === color
                        ? 'ring-2 ring-slate-900 ring-offset-1 dark:ring-slate-100 dark:ring-offset-slate-900'
                        : ''
                    }`}
                  />
                ))}
              </div>
              <Button type="submit" size="sm" disabled={isLabelBusy || !newLabelName.trim()}>
                Create
              </Button>
            </form>
          )}
          {labelError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{labelError}</p>}
        </div>
      )}

      {card && (
        <div className={SECTION_CLASS}>
          <h3 className={SECTION_TITLE_CLASS}>Comments</h3>
          <div className="mt-2 flex max-h-56 flex-col gap-3 overflow-y-auto">
            {commentsLoading && (
              <p className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <Spinner className="h-3.5 w-3.5" /> Loading comments…
              </p>
            )}
            {!commentsLoading && comments.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar name={comment.author.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {comment.author.name}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{comment.body}</p>
                </div>
                {comment.authorId === user?.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={deletingCommentId === comment.id}
                    aria-label="Delete comment"
                    className="flex-shrink-0 text-slate-300 hover:text-red-500 disabled:opacity-50 dark:text-slate-600 dark:hover:text-red-400"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
            <Input
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Write a comment…"
              aria-label="New comment"
              className="flex-1 py-1.5"
            />
            <Button type="submit" size="sm" isLoading={isPostingComment} disabled={!newComment.trim()}>
              Post
            </Button>
          </form>
          {commentError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{commentError}</p>}
        </div>
      )}
    </Modal>
  );
}
