import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Card } from '@taskflow/shared';
import { KanbanBoard } from './KanbanBoard';
import type { ColumnWithCards } from '../../lib/board/reorder';
import { EMPTY_FILTERS, type BoardFilters } from '../../lib/board/filters';
import type { CardFormValues } from './CardModal';

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: 'card',
    columnId: 'col-1',
    title: 'Card',
    description: null,
    position: 0,
    assigneeId: null,
    priority: 'MEDIUM',
    labels: [],
    dueDate: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeColumns(): ColumnWithCards[] {
  return [
    {
      id: 'col-1',
      boardId: 'board-1',
      title: 'To Do',
      position: 0,
      createdAt: '',
      updatedAt: '',
      cards: [
        makeCard({ id: 'card-a', title: 'Card A', position: 0 }),
        makeCard({ id: 'card-b', title: 'Card B', position: 1 }),
      ],
    },
    {
      id: 'col-2',
      boardId: 'board-1',
      title: 'Done',
      position: 1,
      createdAt: '',
      updatedAt: '',
      cards: [],
    },
  ];
}

function noop(): void {}
async function noopAsync(): Promise<void> {}

interface RenderOverrides {
  onColumnsChange?: (columns: ColumnWithCards[]) => void;
  onColumnMoved?: (columnId: string, toIndex: number, previousColumns: ColumnWithCards[]) => void;
  onCardMoved?: (cardId: string, toColumnId: string, toIndex: number, previousColumns: ColumnWithCards[]) => void;
  filters?: BoardFilters;
}

function renderBoard(columns: ColumnWithCards[], overrides: RenderOverrides = {}) {
  return render(
    <KanbanBoard
      columns={columns}
      members={[]}
      workspaceId="workspace-1"
      filters={overrides.filters ?? EMPTY_FILTERS}
      onColumnsChange={overrides.onColumnsChange ?? noop}
      onColumnMoved={overrides.onColumnMoved ?? noop}
      onCardMoved={overrides.onCardMoved ?? noop}
      onCreateColumn={async () => noopAsync()}
      onRenameColumn={noop}
      onDeleteColumn={noop}
      onCreateCard={async (_columnId: string, _values: CardFormValues) => noopAsync()}
      onUpdateCard={async (_cardId: string, _values: CardFormValues) => noopAsync()}
      onDeleteCard={async (_cardId: string) => noopAsync()}
      onCardUpdated={noop}
    />,
  );
}

/**
 * dnd-kit's keyboard coordinate getter filters candidate drop targets using
 * `getBoundingClientRect()`, which jsdom always reports as a zero rect. Mock it
 * to lay out card/column elements along their list axis so keyboard-driven
 * drags have real positions to compare against.
 */
function mockLayoutRects(): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const empty = { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} };
    if (this.matches('[data-testid="card-item"]')) {
      const siblings = Array.from(document.querySelectorAll('[data-testid="card-item"]'));
      const index = siblings.indexOf(this);
      return { ...empty, top: index * 60, bottom: index * 60 + 50, height: 50, width: 250, right: 250 };
    }
    if (this.matches('[data-testid="board-column"]')) {
      const siblings = Array.from(document.querySelectorAll('[data-testid="board-column"]'));
      const index = siblings.indexOf(this);
      return { ...empty, left: index * 300, right: index * 300 + 280, width: 280, height: 500, bottom: 500 };
    }
    return empty;
  });
}

async function flushKeyboardSensorSetup(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('KanbanBoard rendering', () => {
  it('renders columns with their cards', () => {
    renderBoard(makeColumns());

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Card A')).toBeInTheDocument();
    expect(screen.getByText('Card B')).toBeInTheDocument();
  });

  it('shows an "add column" affordance', () => {
    renderBoard(makeColumns());
    expect(screen.getByRole('button', { name: /add column/i })).toBeInTheDocument();
  });
});

describe('KanbanBoard drag-and-drop reorder', () => {
  beforeEach(() => {
    mockLayoutRects();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reorders cards within a column via keyboard drag and reports the move', async () => {
    const columns = makeColumns();
    const onCardMoved = vi.fn();
    const onColumnsChange = vi.fn();
    renderBoard(columns, { onCardMoved, onColumnsChange });

    const handle = screen.getByRole('button', { name: 'Drag card: Card A' });
    handle.focus();

    fireEvent.keyDown(handle, { code: 'Space' });
    await flushKeyboardSensorSetup();
    fireEvent.keyDown(handle, { code: 'ArrowDown' });
    fireEvent.keyDown(handle, { code: 'Space' });

    expect(onCardMoved).toHaveBeenCalledTimes(1);
    const [cardId, toColumnId, toIndex] = onCardMoved.mock.calls[0] as [string, string, number, ColumnWithCards[]];
    expect(cardId).toBe('card-a');
    expect(toColumnId).toBe('col-1');
    expect(toIndex).toBe(1);

    const finalColumns = onColumnsChange.mock.calls.at(-1)?.[0] as ColumnWithCards[];
    expect(finalColumns.find((c) => c.id === 'col-1')?.cards.map((card) => card.id)).toEqual(['card-b', 'card-a']);
  });
});

describe('KanbanBoard filtering', () => {
  it('dims cards that do not match the active filters, leaving matches at full opacity', () => {
    const columns = makeColumns();
    const filters: BoardFilters = { ...EMPTY_FILTERS, search: 'Card A' };
    renderBoard(columns, { filters });

    const cardA = screen.getByText('Card A').closest('[data-testid="card-item"]') as HTMLElement;
    const cardB = screen.getByText('Card B').closest('[data-testid="card-item"]') as HTMLElement;
    expect(cardA.style.opacity).toBe('1');
    expect(cardB.style.opacity).toBe('0.35');
  });

  it('shows every card at full opacity when no filters are active', () => {
    renderBoard(makeColumns());
    for (const card of screen.getAllByTestId('card-item')) {
      expect((card as HTMLElement).style.opacity).toBe('1');
    }
  });

  it('updates the column count badge to reflect matched vs. total cards', () => {
    const columns = makeColumns();
    const filters: BoardFilters = { ...EMPTY_FILTERS, search: 'Card A' };
    renderBoard(columns, { filters });

    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('shows the plain card count when no filters are active', () => {
    renderBoard(makeColumns());
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
