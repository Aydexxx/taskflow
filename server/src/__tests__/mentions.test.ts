import { describe, expect, it } from 'vitest';
import { extractMentionedUserIds, parseMentions } from '@taskflow/shared';

describe('parseMentions', () => {
  it('returns no mentions for plain text', () => {
    expect(parseMentions('Looks good to me')).toEqual([]);
  });

  it('parses a single mention', () => {
    expect(parseMentions('Hey @[Bob Lee](user-2), can you take a look?')).toEqual([
      { name: 'Bob Lee', userId: 'user-2' },
    ]);
  });

  it('parses multiple mentions in order, including duplicates', () => {
    const body = '@[Alice](user-1) @[Bob](user-2) thanks, and again @[Alice](user-1)';
    expect(parseMentions(body)).toEqual([
      { name: 'Alice', userId: 'user-1' },
      { name: 'Bob', userId: 'user-2' },
      { name: 'Alice', userId: 'user-1' },
    ]);
  });

  it('ignores an unrelated "@" that is not a structured mention', () => {
    expect(parseMentions('reach me at name@example.com')).toEqual([]);
  });
});

describe('extractMentionedUserIds', () => {
  it('dedupes, preserving first-appearance order', () => {
    const body = '@[Alice](user-1) @[Bob](user-2) @[Alice](user-1)';
    expect(extractMentionedUserIds(body)).toEqual(['user-1', 'user-2']);
  });

  it('returns an empty array when there are no mentions', () => {
    expect(extractMentionedUserIds('no mentions here')).toEqual([]);
  });
});
