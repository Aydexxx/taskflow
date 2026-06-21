import { MENTION_PATTERN } from '@taskflow/shared';

export type CommentSegment = { type: 'text'; value: string } | { type: 'mention'; name: string; userId: string };

/** Splits a comment body into plain-text and structured-mention segments, in order. */
export function splitMentionSegments(body: string): CommentSegment[] {
  const segments: CommentSegment[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ type: 'text', value: body.slice(lastIndex, index) });
    segments.push({ type: 'mention', name: match[1] as string, userId: match[2] as string });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < body.length) segments.push({ type: 'text', value: body.slice(lastIndex) });

  return segments;
}
