import { describe, expect, it } from 'vitest';
import { splitMentionSegments } from './mentionRender';

describe('splitMentionSegments', () => {
  it('returns a single text segment for plain text', () => {
    expect(splitMentionSegments('no mentions here')).toEqual([{ type: 'text', value: 'no mentions here' }]);
  });

  it('returns an empty array for an empty body', () => {
    expect(splitMentionSegments('')).toEqual([]);
  });

  it('splits text around a single mention', () => {
    expect(splitMentionSegments('hey @[Bob Lee](user-2) check this')).toEqual([
      { type: 'text', value: 'hey ' },
      { type: 'mention', name: 'Bob Lee', userId: 'user-2' },
      { type: 'text', value: ' check this' },
    ]);
  });

  it('handles a mention with no surrounding text', () => {
    expect(splitMentionSegments('@[Bob Lee](user-2)')).toEqual([{ type: 'mention', name: 'Bob Lee', userId: 'user-2' }]);
  });

  it('handles several mentions in one body', () => {
    expect(splitMentionSegments('@[Alice](user-1) and @[Bob](user-2) thanks')).toEqual([
      { type: 'mention', name: 'Alice', userId: 'user-1' },
      { type: 'text', value: ' and ' },
      { type: 'mention', name: 'Bob', userId: 'user-2' },
      { type: 'text', value: ' thanks' },
    ]);
  });
});
