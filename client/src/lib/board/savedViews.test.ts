import { afterEach, describe, expect, it } from 'vitest';
import { EMPTY_FILTERS } from './filters';
import { deleteSavedView, listSavedViews, saveView } from './savedViews';

const BOARD_ID = 'board-1';

afterEach(() => {
  window.localStorage.clear();
});

describe('savedViews', () => {
  it('returns an empty list when nothing has been saved for the board', () => {
    expect(listSavedViews(BOARD_ID)).toEqual([]);
  });

  it('saves a named view and makes it visible to subsequent listSavedViews calls', () => {
    const filters = { ...EMPTY_FILTERS, search: 'urgent' };
    saveView(BOARD_ID, 'Urgent stuff', filters);

    const views = listSavedViews(BOARD_ID);
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ name: 'Urgent stuff', filters });
  });

  it('accumulates multiple saved views with distinct ids', () => {
    saveView(BOARD_ID, 'View A', EMPTY_FILTERS);
    saveView(BOARD_ID, 'View B', EMPTY_FILTERS);

    const views = listSavedViews(BOARD_ID);
    expect(views.map((view) => view.name)).toEqual(['View A', 'View B']);
    expect(views[0]?.id).not.toBe(views[1]?.id);
  });

  it('deletes a view by id without affecting the others', () => {
    saveView(BOARD_ID, 'Keep me', EMPTY_FILTERS);
    const [toDelete] = saveView(BOARD_ID, 'Delete me', EMPTY_FILTERS).slice(-1);

    const remaining = deleteSavedView(BOARD_ID, toDelete!.id);
    expect(remaining.map((view) => view.name)).toEqual(['Keep me']);
  });

  it('scopes views per board', () => {
    saveView('board-a', 'Only on A', EMPTY_FILTERS);
    expect(listSavedViews('board-b')).toEqual([]);
  });

  it('does not throw and falls back to an empty list when storage holds malformed JSON', () => {
    window.localStorage.setItem('taskflow:savedViews:board-1', '{not valid json');
    expect(listSavedViews(BOARD_ID)).toEqual([]);
  });
});
