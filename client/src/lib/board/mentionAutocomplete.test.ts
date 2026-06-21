import { describe, expect, it } from 'vitest';
import type { WorkspaceMemberWithUser } from '@taskflow/shared';
import { applyMention, findMentionQuery, formatMention, matchMembers } from './mentionAutocomplete';

function makeMember(userId: string, name: string): WorkspaceMemberWithUser {
  return {
    id: `member-${userId}`,
    workspaceId: 'workspace-1',
    userId,
    role: 'MEMBER',
    createdAt: '',
    user: { id: userId, email: `${name.toLowerCase()}@example.com`, name, avatarUrl: null, createdAt: '', updatedAt: '' },
  };
}

const ALICE = makeMember('user-1', 'Alice Johnson');
const BOB = makeMember('user-2', 'Bob Lee');
const MEMBERS = [ALICE, BOB];

describe('findMentionQuery', () => {
  it('finds an in-progress mention at the start of the text', () => {
    expect(findMentionQuery('@bo', 3)).toEqual({ start: 0, query: 'bo' });
  });

  it('finds an in-progress mention after whitespace', () => {
    expect(findMentionQuery('hey @bo', 7)).toEqual({ start: 4, query: 'bo' });
  });

  it('returns null when there is no "@" before the cursor', () => {
    expect(findMentionQuery('hello there', 11)).toBeNull();
  });

  it('returns null once a space ends the mention', () => {
    expect(findMentionQuery('hey @bob done', 13)).toBeNull();
  });

  it('does not trigger mid-word (e.g. an email address)', () => {
    expect(findMentionQuery('reach me at name@example', 24)).toBeNull();
  });

  it('only considers text up to the cursor, not the full value', () => {
    expect(findMentionQuery('@bob and @alice', 4)).toEqual({ start: 0, query: 'bob' });
  });
});

describe('matchMembers', () => {
  it('returns all members for an empty query', () => {
    expect(matchMembers(MEMBERS, '')).toEqual(MEMBERS);
  });

  it('filters case-insensitively by name', () => {
    expect(matchMembers(MEMBERS, 'bob')).toEqual([BOB]);
    expect(matchMembers(MEMBERS, 'ALICE')).toEqual([ALICE]);
  });

  it('caps results at the given limit', () => {
    expect(matchMembers(MEMBERS, '', 1)).toEqual([ALICE]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(matchMembers(MEMBERS, 'zzz')).toEqual([]);
  });
});

describe('formatMention / applyMention', () => {
  it('formats a structured mention reference', () => {
    expect(formatMention(BOB)).toBe('@[Bob Lee](user-2)');
  });

  it('replaces the in-progress query with the formatted mention plus a trailing space', () => {
    const { text, cursor } = applyMention('hey @bo', 4, 7, BOB);
    expect(text).toBe('hey @[Bob Lee](user-2) ');
    expect(cursor).toBe(text.length);
  });

  it('preserves text after the cursor', () => {
    const { text, cursor } = applyMention('@bo and others', 0, 3, BOB);
    expect(text).toBe('@[Bob Lee](user-2)  and others');
    expect(cursor).toBe('@[Bob Lee](user-2) '.length);
  });
});
