import { z } from 'zod';
import { CARD_PRIORITIES, type CardPriority } from '@taskflow/shared';
import type {
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
import { checkRateLimit } from './rateLimit';
import { parseStructured } from './json';
import { aiLogger } from './logger';
import {
  buildDescriptionPrompt,
  buildMetadataPrompt,
  buildSubtasksPrompt,
  buildSummaryPrompt,
  DESCRIPTION_SYSTEM,
  METADATA_SYSTEM,
  SUBTASKS_SYSTEM,
  SUMMARY_SYSTEM,
  type BoardSnapshot,
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

const ACTIVITY_VERB: Record<string, string> = {
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

async function buildBoardSnapshot(boardId: string): Promise<BoardSnapshot> {
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
    take: 8,
  });
  const recentActivity = activities.map((activity) => {
    const metadata = JSON.parse(activity.metadata) as { cardTitle?: string; columnTitle?: string };
    const verb = ACTIVITY_VERB[activity.type] ?? activity.type;
    const subject = metadata.cardTitle ?? metadata.columnTitle ?? '';
    return `${activity.actor.name} ${verb}${subject ? ` "${subject}"` : ''}`;
  });

  return { title: board.title, description: board.description, columns, totalCards, overdueCards, recentActivity };
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
