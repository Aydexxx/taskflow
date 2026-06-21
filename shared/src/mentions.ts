/**
 * @mentions are embedded directly in comment body text as a structured
 * reference — `@[Display Name](userId)` — rather than tracked out-of-band.
 * This keeps the comment body itself the single source of truth for both
 * storage and display: no separate join table to keep in sync, and the
 * mention survives unedited even if the member's name later changes
 * (the stored name is a point-in-time snapshot, same rationale as
 * `ActivityMetadata`'s denormalized fields).
 */
export const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

export interface MentionReference {
  name: string;
  userId: string;
}

/** Every mention in `body`, in order of appearance (may contain duplicate userIds). */
export function parseMentions(body: string): MentionReference[] {
  const mentions: MentionReference[] = [];
  for (const match of body.matchAll(MENTION_PATTERN)) {
    mentions.push({ name: match[1] as string, userId: match[2] as string });
  }
  return mentions;
}

/** Distinct mentioned user ids, in first-appearance order. */
export function extractMentionedUserIds(body: string): string[] {
  const seen = new Set<string>();
  for (const mention of parseMentions(body)) seen.add(mention.userId);
  return [...seen];
}
