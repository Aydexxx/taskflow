import { z } from 'zod';
import { CARD_PRIORITIES, type CardPriority } from '@taskflow/shared';
import type {
  AskAssistantResponse,
  AskBoardResponse,
  AskWorkspaceResponse,
  ChatMessage,
  DraftDescriptionResponse,
  SuggestMetadataResponse,
  SuggestSubtasksResponse,
  SummarizeBoardResponse,
} from '@taskflow/shared';
import { prisma } from '../prisma';
import { requireWorkspaceMember, resolveBoardWorkspaceId, resolveCardContext } from '../authorization';
import { NotFoundError, ServiceUnavailableError, TooManyRequestsError } from '../../errors/HttpError';
import { env } from '../../config/env';
import { getAiService } from './index';
import type { LlmMessage } from './types';
import { checkRateLimit } from './rateLimit';
import { parseStructured } from './json';
import { aiLogger } from './logger';
import {
  ASK_SYSTEM,
  buildAskPrompt,
  buildDescriptionPrompt,
  buildGlobalAssistantSystem,
  buildMetadataPrompt,
  buildSubtasksPrompt,
  buildSummaryPrompt,
  buildWorkspaceAskPrompt,
  DESCRIPTION_SYSTEM,
  METADATA_SYSTEM,
  SUBTASKS_SYSTEM,
  SUMMARY_SYSTEM,
  WORKSPACE_ASK_SYSTEM,
  type BoardSnapshot,
  type GlobalSnapshot,
  type WorkspaceSnapshot,
} from './prompts';

/**
 * AI feature services. Each one, in order:
 *   1. authorization-checks the caller against the relevant workspace,
 *   2. enforces a per-user rate limit (cost guard),
 *   3. confirms AI is enabled (hard backstop; routes also gate this),
 *   4. calls the provider and defensively parses the result, falling back
 *      gracefully on bad/empty output rather than failing the request.
 *
 * Nothing here mutates board data — every result is a draft/suggestion the
 * user reviews and confirms through the existing (separately authorized) write
 * endpoints.
 */

/** Throws 503 if AI is off — callers should also be behind `requireAiEnabled`. */
function requireEnabled(): void {
  if (!getAiService().isEnabled()) throw new ServiceUnavailableError('AI features are not enabled');
}

/** Throws 429 once a user exceeds their per-minute AI budget. */
function enforceRateLimit(userId: string): void {
  const result = checkRateLimit(userId, env.ai.rateLimitPerMinute);
  if (!result.allowed) {
    aiLogger.warn('rate_limited', { retryAfter: result.retryAfterSeconds });
    throw new TooManyRequestsError('AI rate limit exceeded; please try again shortly', result.retryAfterSeconds);
  }
}

// --- Board summary -------------------------------------------------------

const SUMMARY_TTL_MS = 60_000;
const summaryCache = new Map<string, { text: string; expiresAt: number }>();

export const ACTIVITY_VERB: Record<string, string> = {
  card_created: 'created card',
  card_deleted: 'deleted card',
  card_moved: 'moved card',
  card_assigned: 'assigned card',
  card_unassigned: 'unassigned card',
  card_label_added: 'labeled card',
  card_label_removed: 'unlabeled card',
  card_commented: 'commented on card',
  column_created: 'created column',
  column_deleted: 'deleted column',
};

export async function summarizeBoard(boardId: string, userId: string): Promise<SummarizeBoardResponse> {
  const workspaceId = await resolveBoardWorkspaceId(boardId);
  await requireWorkspaceMember(workspaceId, userId);
  enforceRateLimit(userId);
  requireEnabled();

  // Cost-aware: board content changes slowly relative to how often a manager
  // might click "summarize", so reuse a recent summary within a short TTL.
  const cached = summaryCache.get(boardId);
  if (cached && cached.expiresAt > Date.now()) {
    aiLogger.info('summary.cache_hit', { boardId });
    return { summary: cached.text };
  }

  const snapshot = await buildBoardSnapshot(boardId);
  const raw = await getAiService().generate('summarize_board', buildSummaryPrompt(snapshot), {
    system: SUMMARY_SYSTEM,
    temperature: 0.3,
  });

  const summary = raw.trim();
  summaryCache.set(boardId, { text: summary, expiresAt: Date.now() + SUMMARY_TTL_MS });
  return { summary };
}

/** Tuning for how much history the snapshot carries; summary and ask differ. */
interface SnapshotOptions {
  /** How many recent activity entries to include. */
  activityLimit: number;
  /** Whether to tag each activity entry with a relative timestamp. */
  withTimestamps: boolean;
}

const SUMMARY_SNAPSHOT: SnapshotOptions = { activityLimit: 8, withTimestamps: false };
const ASK_SNAPSHOT: SnapshotOptions = { activityLimit: 25, withTimestamps: true };

async function buildBoardSnapshot(
  boardId: string,
  options: SnapshotOptions = SUMMARY_SNAPSHOT,
): Promise<BoardSnapshot> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: { cards: { orderBy: { position: 'asc' }, select: { title: true, dueDate: true } } },
      },
    },
  });
  if (!board) throw new NotFoundError('Board not found');

  const now = Date.now();
  const isOverdue = (dueDate: Date | null): boolean => dueDate !== null && dueDate.getTime() < now;

  let totalCards = 0;
  let overdueCards = 0;
  const columns = board.columns.map((column) => {
    const overdueCount = column.cards.filter((card) => isOverdue(card.dueDate)).length;
    totalCards += column.cards.length;
    overdueCards += overdueCount;
    return {
      title: column.title,
      cardCount: column.cards.length,
      overdueCount,
      sampleTitles: column.cards.slice(0, 3).map((card) => card.title),
    };
  });

  const activities = await prisma.activity.findMany({
    where: { boardId },
    include: { actor: { select: { name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: options.activityLimit,
  });
  const recentActivity = activities.map((activity) => {
    const metadata = JSON.parse(activity.metadata) as { cardTitle?: string; columnTitle?: string };
    const verb = ACTIVITY_VERB[activity.type] ?? activity.type;
    const subject = metadata.cardTitle ?? metadata.columnTitle ?? '';
    const line = `${activity.actor.name} ${verb}${subject ? ` "${subject}"` : ''}`;
    // Ask needs to answer "who did what recently" questions, so tag each entry
    // with a compact relative time; the summary omits it to stay terse.
    return options.withTimestamps ? `${line} (${relativeTime(activity.createdAt, now)})` : line;
  });

  return { title: board.title, description: board.description, columns, totalCards, overdueCards, recentActivity };
}

/** Compact "3h ago" style relative time for grounding activity in the ask prompt. */
function relativeTime(then: Date, now: number): string {
  const seconds = Math.max(0, Math.round((now - then.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// --- Ask the board -------------------------------------------------------

/**
 * Answer a free-form question grounded in a board's current state and recent
 * activity. Read-only Q&A: nothing is cached (each question differs) and
 * nothing is mutated.
 */
export async function askBoard(boardId: string, userId: string, question: string): Promise<AskBoardResponse> {
  const workspaceId = await resolveBoardWorkspaceId(boardId);
  await requireWorkspaceMember(workspaceId, userId);
  enforceRateLimit(userId);
  requireEnabled();

  const snapshot = await buildBoardSnapshot(boardId, ASK_SNAPSHOT);
  const raw = await getAiService().generate('ask_board', buildAskPrompt(snapshot, question), {
    system: ASK_SYSTEM,
    temperature: 0.3,
  });

  const answer = raw.trim();
  if (!answer) aiLogger.warn('ask.empty', { boardId });
  return { answer };
}

// --- Ask the workspace ---------------------------------------------------

/** Sensible caps to keep the workspace snapshot compact (token cost). */
const WORKSPACE_MEMBER_LIMIT = 50;
const WORKSPACE_BOARD_LIMIT = 30;
const WORKSPACE_ACTIVITY_LIMIT = 40;

/**
 * Answer a free-form question grounded in a workspace's members, boards, and
 * recent activity across all of its boards. Read-only Q&A: nothing is cached
 * (each question differs) and nothing is mutated.
 */
export async function askWorkspace(
  workspaceId: string,
  userId: string,
  question: string,
): Promise<AskWorkspaceResponse> {
  await requireWorkspaceMember(workspaceId, userId);
  enforceRateLimit(userId);
  requireEnabled();

  const snapshot = await buildWorkspaceSnapshot(workspaceId);
  const raw = await getAiService().generate('ask_workspace', buildWorkspaceAskPrompt(snapshot, question), {
    system: WORKSPACE_ASK_SYSTEM,
    temperature: 0.3,
  });

  const answer = raw.trim();
  if (!answer) aiLogger.warn('ask_workspace.empty', { workspaceId });
  return { answer };
}

async function buildWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  if (!workspace) throw new NotFoundError('Workspace not found');

  const now = Date.now();
  const isOverdue = (dueDate: Date | null): boolean => dueDate !== null && dueDate.getTime() < now;

  const memberRows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
    take: WORKSPACE_MEMBER_LIMIT,
  });
  const members = memberRows.map((member) => ({ name: member.user.name, role: member.role }));

  const boardRows = await prisma.board.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
    take: WORKSPACE_BOARD_LIMIT,
    include: { columns: { include: { cards: { select: { dueDate: true } } } } },
  });
  // Denormalize per-board tallies, and keep a title lookup for tagging activity.
  const boardTitleById = new Map<string, string>();
  const boards = boardRows.map((board) => {
    boardTitleById.set(board.id, board.title);
    let totalCards = 0;
    let overdueCards = 0;
    for (const column of board.columns) {
      totalCards += column.cards.length;
      overdueCards += column.cards.filter((card) => isOverdue(card.dueDate)).length;
    }
    return { title: board.title, totalCards, overdueCards };
  });

  // Activity is stored per-board, so fan out across every board in the workspace
  // and take the most recent slice so "what did X do recently" is answerable.
  const activities = await prisma.activity.findMany({
    where: { boardId: { in: [...boardTitleById.keys()] } },
    include: { actor: { select: { name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: WORKSPACE_ACTIVITY_LIMIT,
  });
  const recentActivity = activities.map((activity) => {
    const metadata = JSON.parse(activity.metadata) as { cardTitle?: string; columnTitle?: string };
    const verb = ACTIVITY_VERB[activity.type] ?? activity.type;
    const subject = metadata.cardTitle ?? metadata.columnTitle ?? '';
    const boardTitle = boardTitleById.get(activity.boardId) ?? 'a board';
    const where = ` on board "${boardTitle}"`;
    return `${activity.actor.name} ${verb}${subject ? ` "${subject}"` : ''}${where} (${relativeTime(
      activity.createdAt,
      now,
    )})`;
  });

  return { name: workspace.name, members, boards, recentActivity };
}

// --- Global conversational assistant -------------------------------------

/** Compact caps for the global snapshot so multi-workspace context stays affordable. */
const GLOBAL_WORKSPACE_LIMIT = 10;
const GLOBAL_MEMBER_LIMIT = 20;
const GLOBAL_BOARD_LIMIT = 10;
const GLOBAL_ACTIVITY_LIMIT = 15;
/** Only the last N conversation turns are replayed to the model to bound tokens. */
const ASSISTANT_HISTORY_LIMIT = 8;

/**
 * Answer a free-form question about everything the user can see across all of
 * their workspaces, with multi-turn memory. Read-only Q&A: nothing is cached or
 * mutated. RBAC is enforced by `buildGlobalSnapshot`, which only ever reads
 * workspaces the user belongs to.
 */
export async function askAssistant(
  userId: string,
  question: string,
  history: ChatMessage[] = [],
): Promise<AskAssistantResponse> {
  enforceRateLimit(userId);
  requireEnabled();

  const snapshot = await buildGlobalSnapshot(userId);

  // Replay only the most recent turns to keep the request bounded, then append
  // the new question. The system message carries the RBAC-scoped context.
  const recentHistory = history.slice(-ASSISTANT_HISTORY_LIMIT);
  const messages: LlmMessage[] = [
    { role: 'system', content: buildGlobalAssistantSystem(snapshot) },
    ...recentHistory.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: question },
  ];

  const raw = await getAiService().chat('ask_assistant', messages, { temperature: 0.3 });
  const answer = raw.trim();
  if (!answer) aiLogger.warn('assistant.empty', { userId });
  return { answer };
}

/**
 * Build the cross-workspace context for the global assistant.
 *
 * RBAC INVARIANT: we select ONLY workspaces where the user is a member
 * (`members: { some: { userId } }`) and scope every nested query to those
 * workspace/board ids. There is no code path here that can read a workspace the
 * user does not belong to, so the resulting snapshot is inherently RBAC-safe.
 */
async function buildGlobalSnapshot(userId: string): Promise<GlobalSnapshot> {
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    orderBy: { updatedAt: 'desc' }, // most recently active first, then capped
    take: GLOBAL_WORKSPACE_LIMIT,
    select: { id: true, name: true },
  });

  const now = Date.now();
  const snapshots = await Promise.all(
    workspaces.map((workspace) => buildGlobalWorkspaceSnapshot(workspace, now)),
  );
  return { workspaces: snapshots };
}

/** Compact per-workspace snapshot used inside the global assistant context. */
async function buildGlobalWorkspaceSnapshot(
  workspace: { id: string; name: string },
  now: number,
): Promise<WorkspaceSnapshot> {
  const isOverdue = (dueDate: Date | null): boolean => dueDate !== null && dueDate.getTime() < now;

  const memberRows = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
    take: GLOBAL_MEMBER_LIMIT,
  });
  const members = memberRows.map((member) => ({ name: member.user.name, role: member.role }));

  const boardRows = await prisma.board.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: 'desc' },
    take: GLOBAL_BOARD_LIMIT,
    include: { columns: { include: { cards: { select: { dueDate: true } } } } },
  });
  const boardTitleById = new Map<string, string>();
  const boards = boardRows.map((board) => {
    boardTitleById.set(board.id, board.title);
    let totalCards = 0;
    let overdueCards = 0;
    for (const column of board.columns) {
      totalCards += column.cards.length;
      overdueCards += column.cards.filter((card) => isOverdue(card.dueDate)).length;
    }
    return { title: board.title, totalCards, overdueCards };
  });

  const activities = await prisma.activity.findMany({
    where: { boardId: { in: [...boardTitleById.keys()] } },
    include: { actor: { select: { name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: GLOBAL_ACTIVITY_LIMIT,
  });
  const recentActivity = activities.map((activity) => {
    const metadata = JSON.parse(activity.metadata) as { cardTitle?: string; columnTitle?: string };
    const verb = ACTIVITY_VERB[activity.type] ?? activity.type;
    const subject = metadata.cardTitle ?? metadata.columnTitle ?? '';
    const boardTitle = boardTitleById.get(activity.boardId) ?? 'a board';
    return `${activity.actor.name} ${verb}${subject ? ` "${subject}"` : ''} on board "${boardTitle}" (${relativeTime(
      activity.createdAt,
      now,
    )})`;
  });

  return { name: workspace.name, members, boards, recentActivity };
}

// --- Subtask breakdown ---------------------------------------------------

const subtasksSchema = z.object({
  subtasks: z.array(z.string().trim().min(1)).max(20),
});

export async function suggestSubtasks(cardId: string, userId: string): Promise<SuggestSubtasksResponse> {
  const { card } = await authorizeCard(cardId, userId);
  enforceRateLimit(userId);
  requireEnabled();

  const raw = await getAiService().generate('suggest_subtasks', buildSubtasksPrompt(card.title, card.description), {
    system: SUBTASKS_SYSTEM,
    temperature: 0.4,
  });

  const parsed = parseStructured(raw, subtasksSchema);
  if (!parsed) {
    aiLogger.warn('subtasks.parse_failed', { cardId });
    return { subtasks: [] };
  }
  // De-dupe and cap to a sensible checklist length.
  const subtasks = [...new Set(parsed.subtasks.map((s) => s.trim()))].filter(Boolean).slice(0, 10);
  return { subtasks };
}

// --- Description draft ----------------------------------------------------

const descriptionSchema = z.object({ description: z.string().trim().min(1) });

export async function draftDescription(
  workspaceId: string,
  userId: string,
  title: string,
): Promise<DraftDescriptionResponse> {
  await requireWorkspaceMember(workspaceId, userId);
  enforceRateLimit(userId);
  requireEnabled();

  const raw = await getAiService().generate('draft_description', buildDescriptionPrompt(title), {
    system: DESCRIPTION_SYSTEM,
    temperature: 0.5,
  });

  const parsed = parseStructured(raw, descriptionSchema);
  if (parsed) return { description: parsed.description.trim() };

  // Fallback: the model ignored the JSON contract but still produced prose —
  // use the raw text rather than failing, since this is a free-form draft.
  const fallback = raw.trim();
  if (fallback) {
    aiLogger.warn('description.used_raw_fallback', { workspaceId });
    return { description: fallback };
  }
  aiLogger.warn('description.empty', { workspaceId });
  return { description: '' };
}

// --- Label / priority suggestions ----------------------------------------

const PRIORITY_SET = new Set<string>(CARD_PRIORITIES);

const metadataSchema = z.object({
  labels: z.array(z.string().trim().min(1)).max(8).optional(),
  priority: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => PRIORITY_SET.has(value), { message: 'unknown priority' })
    .nullable()
    .optional(),
  reason: z.string().trim().max(280).optional(),
});

export async function suggestMetadata(cardId: string, userId: string): Promise<SuggestMetadataResponse> {
  const { card, workspaceId } = await authorizeCard(cardId, userId);
  enforceRateLimit(userId);
  requireEnabled();

  const workspaceLabels = await prisma.label.findMany({ where: { workspaceId }, select: { name: true } });

  const raw = await getAiService().generate(
    'suggest_metadata',
    buildMetadataPrompt(card.title, card.description, workspaceLabels.map((l) => l.name)),
    { system: METADATA_SYSTEM, temperature: 0.3 },
  );

  const parsed = parseStructured(raw, metadataSchema);
  if (!parsed) {
    aiLogger.warn('metadata.parse_failed', { cardId });
    return { labels: [], priority: null };
  }
  const labels = [...new Set((parsed.labels ?? []).map((l) => l.trim().toLowerCase()))].filter(Boolean).slice(0, 6);
  const priority = (parsed.priority ?? null) as CardPriority | null;
  return { labels, priority, ...(parsed.reason ? { reason: parsed.reason } : {}) };
}

// --- Shared helpers -------------------------------------------------------

/** Authorize membership for a card and return its workspace plus title/description. */
async function authorizeCard(
  cardId: string,
  userId: string,
): Promise<{ workspaceId: string; card: { title: string; description: string | null } }> {
  const { workspaceId } = await resolveCardContext(cardId);
  await requireWorkspaceMember(workspaceId, userId);
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { title: true, description: true } });
  if (!card) throw new NotFoundError('Card not found');
  return { workspaceId, card };
}

/** Clear AI feature caches. Used between tests for determinism. */
export function resetAiCaches(): void {
  summaryCache.clear();
}
