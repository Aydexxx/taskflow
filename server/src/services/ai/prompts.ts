import { CARD_PRIORITIES } from '@taskflow/shared';

/**
 * Prompt templates for each AI feature, kept in one place so wording and the
 * required output shape are easy to review and tune. Structured features
 * demand strict JSON and name the exact keys; the matching zod schema in
 * `features.ts` is the contract enforced on whatever comes back.
 */

const STRICT_JSON_RULE =
  'Respond with ONLY a single valid JSON object. No markdown, no code fences, no commentary before or after.';

/** Compact, denormalized snapshot of a board passed into the summary prompt. */
export interface BoardSnapshot {
  title: string;
  description: string | null;
  columns: Array<{ title: string; cardCount: number; overdueCount: number; sampleTitles: string[] }>;
  totalCards: number;
  overdueCards: number;
  recentActivity: string[];
}

export const SUMMARY_SYSTEM =
  'You are a concise project-management assistant. You write clear, factual status digests for a busy manager. ' +
  'Base everything strictly on the data provided; never invent cards, people, or dates.';

export function buildSummaryPrompt(snapshot: BoardSnapshot): string {
  const columns = snapshot.columns
    .map((column) => {
      const samples = column.sampleTitles.length > 0 ? ` — e.g. ${column.sampleTitles.join('; ')}` : '';
      return `- ${column.title}: ${column.cardCount} card(s), ${column.overdueCount} overdue${samples}`;
    })
    .join('\n');
  const activity = snapshot.recentActivity.length > 0 ? snapshot.recentActivity.map((a) => `- ${a}`).join('\n') : '- (none recorded)';

  return [
    `Board: ${snapshot.title}`,
    snapshot.description ? `About: ${snapshot.description}` : '',
    `Totals: ${snapshot.totalCards} card(s), ${snapshot.overdueCards} overdue.`,
    '',
    'Columns:',
    columns || '- (no columns)',
    '',
    'Recent activity:',
    activity,
    '',
    'Write a short status digest (3-6 sentences) a manager can skim: overall progress, where work is piling up, ' +
      'overdue risks, and any notable recent movement. Plain prose, no headings, no bullet list.',
  ]
    .filter(Boolean)
    .join('\n');
}

export const ASK_SYSTEM =
  'You are a precise assistant that answers questions about a single Kanban board. ' +
  'Answer ONLY from the board data provided in the prompt (columns, cards, counts, overdue info, and recent activity). ' +
  'Be concise and factual. Never invent cards, people, dates, or numbers that are not in the data. ' +
  "If the data does not contain the answer, say so plainly (e.g. \"The board data doesn't show that\") rather than guessing.";

export function buildAskPrompt(snapshot: BoardSnapshot, question: string): string {
  const columns = snapshot.columns
    .map((column) => {
      const samples = column.sampleTitles.length > 0 ? ` — e.g. ${column.sampleTitles.join('; ')}` : '';
      return `- ${column.title}: ${column.cardCount} card(s), ${column.overdueCount} overdue${samples}`;
    })
    .join('\n');
  const activity =
    snapshot.recentActivity.length > 0
      ? snapshot.recentActivity.map((a) => `- ${a}`).join('\n')
      : '- (none recorded)';

  return [
    `Board: ${snapshot.title}`,
    snapshot.description ? `About: ${snapshot.description}` : '',
    `Totals: ${snapshot.totalCards} card(s), ${snapshot.overdueCards} overdue.`,
    '',
    'Columns:',
    columns || '- (no columns)',
    '',
    'Recent activity (most recent first):',
    activity,
    '',
    `Question: ${question}`,
    '',
    'Answer the question using only the board data above. Keep it short (1-4 sentences), plain prose, no headings. ' +
      "If the data doesn't contain the answer, say so.",
  ]
    .filter(Boolean)
    .join('\n');
}

export const SUBTASKS_SYSTEM =
  'You break work items into small, actionable subtasks. ' + STRICT_JSON_RULE;

export function buildSubtasksPrompt(title: string, description: string | null): string {
  return [
    `Card title: ${title}`,
    description ? `Card description: ${description}` : 'Card description: (none)',
    '',
    'Propose 3 to 7 concrete, independently-checkable subtasks to complete this card.',
    'Each subtask is a short imperative phrase (no numbering, no trailing punctuation).',
    'Output JSON of the form: {"subtasks": ["First subtask", "Second subtask"]}',
  ].join('\n');
}

export const DESCRIPTION_SYSTEM =
  'You write clear, professional task descriptions for a Kanban board. ' + STRICT_JSON_RULE;

export function buildDescriptionPrompt(title: string): string {
  return [
    `Card title: ${title}`,
    '',
    'Write a concise description draft (2-4 sentences) clarifying the goal, scope, and a sensible acceptance ' +
      'criterion. Neutral, professional tone. Do not invent specific names, dates, or numbers.',
    'Output JSON of the form: {"description": "..."}',
  ].join('\n');
}

export const METADATA_SYSTEM =
  'You triage Kanban cards by suggesting labels and a priority. ' + STRICT_JSON_RULE;

export function buildMetadataPrompt(title: string, description: string | null, existingLabels: string[]): string {
  const palette = existingLabels.length > 0 ? existingLabels.join(', ') : '(none yet)';
  return [
    `Card title: ${title}`,
    description ? `Card description: ${description}` : 'Card description: (none)',
    `Existing workspace labels you may reuse: ${palette}`,
    '',
    'Suggest 1 to 4 short label names (reuse existing labels where they fit, otherwise propose new lowercase names) ' +
      `and exactly one priority from: ${CARD_PRIORITIES.join(', ')}.`,
    'If you cannot justify a priority, use null.',
    'Output JSON of the form: {"labels": ["bug"], "priority": "HIGH", "reason": "one short sentence"}',
  ].join('\n');
}
