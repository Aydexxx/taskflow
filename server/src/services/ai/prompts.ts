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

/** Compact, denormalized snapshot of a whole workspace passed into the workspace-ask prompt. */
export interface WorkspaceSnapshot {
  name: string;
  members: Array<{ name: string; role: string }>;
  boards: Array<{ title: string; totalCards: number; overdueCards: number }>;
  /** Recent activity across every board in the workspace, most recent first. */
  recentActivity: string[];
}

export const WORKSPACE_ASK_SYSTEM =
  'You are a precise assistant that answers questions about a single workspace in a Kanban tool. ' +
  'Answer ONLY from the workspace data provided in the prompt (members and their roles, boards with card/overdue ' +
  'counts, and recent activity across boards). Be concise and factual. Never invent people, boards, cards, or dates ' +
  'that are not in the data. If the data does not contain the answer, say so plainly ' +
  "(e.g. \"The workspace data doesn't show that\") rather than guessing.";

export function buildWorkspaceAskPrompt(snapshot: WorkspaceSnapshot, question: string): string {
  const members =
    snapshot.members.length > 0
      ? snapshot.members.map((member) => `- ${member.name} (${member.role})`).join('\n')
      : '- (no members)';
  const boards =
    snapshot.boards.length > 0
      ? snapshot.boards
          .map((board) => `- ${board.title}: ${board.totalCards} card(s), ${board.overdueCards} overdue`)
          .join('\n')
      : '- (no boards)';
  const activity =
    snapshot.recentActivity.length > 0
      ? snapshot.recentActivity.map((a) => `- ${a}`).join('\n')
      : '- (none recorded)';

  return [
    `Workspace: ${snapshot.name}`,
    '',
    'Members (name and role):',
    members,
    '',
    'Boards:',
    boards,
    '',
    'Recent activity across all boards (most recent first):',
    activity,
    '',
    `Question: ${question}`,
    '',
    'Answer the question using only the workspace data above. Keep it short (1-4 sentences), plain prose, no headings. ' +
      "If the data doesn't contain the answer, say so.",
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Everything the current user can access, one entry per workspace they belong
 * to. Assembled from membership-scoped queries, so it is inherently RBAC-safe.
 */
export interface GlobalSnapshot {
  workspaces: WorkspaceSnapshot[];
}

export const GLOBAL_ASSISTANT_SYSTEM =
  "You are TaskFlow's helpful, conversational assistant. You answer the user's questions about their work across " +
  'all of their workspaces. Answer ONLY from the CONTEXT data provided below — it already contains everything (and ' +
  'only what) this user is allowed to see; the user can only see their own workspaces, so never mention or imply data ' +
  'about workspaces, boards, cards, or people outside the context. Be concise, factual, and conversational. Never ' +
  'invent people, boards, cards, dates, or numbers. If the context does not contain the answer, say so plainly ' +
  "(e.g. \"I don't see that in your workspaces\") rather than guessing.";

/** Render one workspace block for the assistant context. */
function renderWorkspaceContext(workspace: WorkspaceSnapshot): string {
  const members =
    workspace.members.length > 0
      ? workspace.members.map((member) => `  - ${member.name} (${member.role})`).join('\n')
      : '  - (no members)';
  const boards =
    workspace.boards.length > 0
      ? workspace.boards
          .map((board) => `  - ${board.title}: ${board.totalCards} card(s), ${board.overdueCards} overdue`)
          .join('\n')
      : '  - (no boards)';
  const activity =
    workspace.recentActivity.length > 0
      ? workspace.recentActivity.map((a) => `  - ${a}`).join('\n')
      : '  - (none recorded)';

  return [
    `Workspace: ${workspace.name}`,
    ' Members:',
    members,
    ' Boards:',
    boards,
    ' Recent activity (most recent first):',
    activity,
  ].join('\n');
}

/** Build the assistant system message with the RBAC-scoped snapshot embedded as context. */
export function buildGlobalAssistantSystem(snapshot: GlobalSnapshot): string {
  const context =
    snapshot.workspaces.length > 0
      ? snapshot.workspaces.map(renderWorkspaceContext).join('\n\n')
      : 'The user is not a member of any workspaces yet.';

  return [
    GLOBAL_ASSISTANT_SYSTEM,
    '',
    'CONTEXT — this is everything the current user can access, and the only data you may use:',
    context,
  ].join('\n');
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
