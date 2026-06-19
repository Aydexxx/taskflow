import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SOCKET_EVENTS } from '@taskflow/shared';
import type { Card } from '@taskflow/shared';
import type { ColumnWithCards } from '../lib/board/reorder';

// A minimal in-memory stand-in for the singleton Socket.IO client. It records
// listeners so the test can deliver server-to-client broadcasts via `trigger`,
// and acks a `board:join` so the hook completes its initial subscription. No
// real network or socket.io-client is involved — this exercises the hook's
// event-to-state translation in isolation.
const { fakeSocket, trigger, resetSocket } = vi.hoisted(() => {
  type Handler = (payload: unknown) => void;
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    connected: true,
    on(event: string, handler: Handler) {
      const set = handlers.get(event) ?? new Set<Handler>();
      set.add(handler);
      handlers.set(event, set);
    },
    off(event: string, handler: Handler) {
      handlers.get(event)?.delete(handler);
    },
    emit(event: string, ...args: unknown[]) {
      const ack = args[args.length - 1];
      if (event === 'board:join' && typeof ack === 'function') {
        (ack as (result: { ok: true }) => void)({ ok: true });
      }
      return socket;
    },
  };
  const trigger = (event: string, payload: unknown): void => {
    handlers.get(event)?.forEach((handler) => handler(payload));
  };
  const resetSocket = (): void => {
    handlers.clear();
    socket.connected = true;
  };
  return { fakeSocket: socket, trigger, resetSocket };
});

vi.mock('../lib/socket', () => ({ socket: fakeSocket }));

import { useBoardRealtime } from './useBoardRealtime';

const BOARD_ID = 'board-1';

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
  return [{ id: 'col-1', boardId: BOARD_ID, title: 'To Do', position: 0, createdAt: '', updatedAt: '', cards: [] }];
}

afterEach(() => {
  resetSocket();
});

describe('useBoardRealtime', () => {
  it('applies an incoming card:created broadcast to local board state', () => {
    let columns = makeColumns();
    const applyEvent = (reducer: (cols: ColumnWithCards[]) => ColumnWithCards[]): void => {
      columns = reducer(columns);
    };

    renderHook(() => useBoardRealtime({ boardId: BOARD_ID, applyEvent, resync: () => {} }));

    const card = makeCard({ id: 'card-new', columnId: 'col-1', title: 'Live card', position: 0 });
    act(() => {
      trigger(SOCKET_EVENTS.CARD_CREATED, { boardId: BOARD_ID, card });
    });

    expect(columns[0]?.cards.map((c) => c.id)).toEqual(['card-new']);
  });

  it('applies a card:moved broadcast once even when delivered twice (a second client sees no duplicate)', () => {
    let columns: ColumnWithCards[] = [
      {
        id: 'col-1',
        boardId: BOARD_ID,
        title: 'To Do',
        position: 0,
        createdAt: '',
        updatedAt: '',
        cards: [makeCard({ id: 'card-x', columnId: 'col-1', position: 0 })],
      },
      { id: 'col-2', boardId: BOARD_ID, title: 'Done', position: 1024, createdAt: '', updatedAt: '', cards: [] },
    ];
    const applyEvent = (reducer: (cols: ColumnWithCards[]) => ColumnWithCards[]): void => {
      columns = reducer(columns);
    };

    renderHook(() => useBoardRealtime({ boardId: BOARD_ID, applyEvent, resync: () => {} }));

    const moved = makeCard({ id: 'card-x', columnId: 'col-2', position: 0 });
    act(() => {
      trigger(SOCKET_EVENTS.CARD_MOVED, { boardId: BOARD_ID, card: moved });
      // A duplicate delivery (re-broadcast, reconnect replay, double subscription).
      trigger(SOCKET_EVENTS.CARD_MOVED, { boardId: BOARD_ID, card: moved });
    });

    expect(columns.find((c) => c.id === 'col-1')?.cards).toHaveLength(0);
    expect(columns.find((c) => c.id === 'col-2')?.cards.map((c) => c.id)).toEqual(['card-x']);
  });

  it('ignores broadcasts addressed to a different board', () => {
    let columns = makeColumns();
    const applyEvent = (reducer: (cols: ColumnWithCards[]) => ColumnWithCards[]): void => {
      columns = reducer(columns);
    };

    renderHook(() => useBoardRealtime({ boardId: BOARD_ID, applyEvent, resync: () => {} }));

    act(() => {
      trigger(SOCKET_EVENTS.CARD_CREATED, {
        boardId: 'some-other-board',
        card: makeCard({ id: 'stray', columnId: 'col-1', position: 0 }),
      });
    });

    expect(columns[0]?.cards).toHaveLength(0);
  });

  it('tracks presence from a presence:sync broadcast', () => {
    const { result } = renderHook(() =>
      useBoardRealtime({ boardId: BOARD_ID, applyEvent: () => {}, resync: () => {} }),
    );

    act(() => {
      trigger(SOCKET_EVENTS.PRESENCE_SYNC, {
        boardId: BOARD_ID,
        users: [{ userId: 'u1', name: 'Alice', avatarUrl: null, editingCardId: null }],
      });
    });

    expect(result.current.presence).toHaveLength(1);
    expect(result.current.presence[0]?.name).toBe('Alice');
  });
});
