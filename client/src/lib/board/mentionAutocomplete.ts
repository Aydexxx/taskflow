import type { WorkspaceMemberWithUser } from '@taskflow/shared';

export interface MentionQuery {
  /** Index in the text where the triggering "@" sits. */
  start: number;
  query: string;
}

/**
 * Finds an in-progress "@query" immediately before `cursor`, or null if the
 * caret isn't inside one. An "@" only starts a mention at the beginning of
 * the text or after whitespace (so emails like "name@host" don't trigger
 * it), and a space ends the query (so a finished mention or an unrelated
 * "@" earlier in the text is ignored once the user has moved past it).
 */
export function findMentionQuery(value: string, cursor: number): MentionQuery | null {
  const upToCursor = value.slice(0, cursor);
  const start = upToCursor.lastIndexOf('@');
  if (start === -1) return null;

  const before = upToCursor[start - 1];
  if (start > 0 && before !== undefined && !/\s/.test(before)) return null;

  const query = upToCursor.slice(start + 1);
  if (/\s/.test(query)) return null;

  return { start, query };
}

/** Workspace members whose name contains `query` (case-insensitive), capped at `limit`. */
export function matchMembers(
  members: WorkspaceMemberWithUser[],
  query: string,
  limit = 5,
): WorkspaceMemberWithUser[] {
  const q = query.trim().toLowerCase();
  const matches = q ? members.filter((member) => member.user.name.toLowerCase().includes(q)) : members;
  return matches.slice(0, limit);
}

/** The structured mention reference embedded in a comment body for `member`. */
export function formatMention(member: WorkspaceMemberWithUser): string {
  return `@[${member.user.name}](${member.userId})`;
}

/** Replaces the in-progress "@query" spanning `[start, cursor)` with a formatted mention. */
export function applyMention(
  value: string,
  start: number,
  cursor: number,
  member: WorkspaceMemberWithUser,
): { text: string; cursor: number } {
  const mention = `${formatMention(member)} `;
  const text = value.slice(0, start) + mention + value.slice(cursor);
  return { text, cursor: start + mention.length };
}
