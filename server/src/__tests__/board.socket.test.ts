import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';
import type {
  ActivityCreatedEvent,
  CardEvent,
  ClientToServerEvents,
  CommentEvent,
  PresenceSyncEvent,
  ServerToClientEvents,
} from '@taskflow/shared';
import { SOCKET_EVENTS } from '@taskflow/shared';
import { prisma } from '../services/prisma';
import { hashPassword } from '../services/password';
import { signAccessToken } from '../services/jwt';
import { createWorkspace, addMember } from '../services/workspaces';
import { createBoard } from '../services/boards';
import { createColumn } from '../services/columns';
import { createCard } from '../services/cards';
import { createComment } from '../services/comments';
import { startSocketTestServer, type SocketTestServer } from '../test/socketTestServer';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let server: SocketTestServer;

beforeAll(async () => {
  server = await startSocketTestServer();
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
  // Workspace.ownerId is ON DELETE RESTRICT, so child rows must go first.
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

async function createUser(name: string, email: string) {
  const passwordHash = await hashPassword('Password123!');
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  return { user, token: signAccessToken(user.id) };
}

function connect(token: string): ClientSocket {
  return ioClient(server.url, {
    transports: ['websocket'],
    autoConnect: false,
    forceNew: true,
    auth: { token },
  });
}

function waitConnect(client: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    client.on('connect', () => resolve());
    client.on('connect_error', (err) => reject(err));
    client.connect();
  });
}

function joinBoard(client: ClientSocket, boardId: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    client.emit(SOCKET_EVENTS.BOARD_JOIN, { boardId }, (result) => {
      resolve(result.ok ? { ok: true } : { ok: false, error: result.error });
    });
  });
}

/** Resolve with the next event of `name`, or reject after `ms`. */
function waitForEvent<T>(client: ClientSocket, name: keyof ServerToClientEvents, ms = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${String(name)}`)), ms);
    const once = client.once.bind(client) as (ev: string, cb: (payload: T) => void) => void;
    once(name, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/**
 * Resolve when a presence event arrives whose user list satisfies `predicate`.
 * Presence is broadcast on every join/leave, so we may see intermediate states.
 */
function waitForPresence(
  client: ClientSocket,
  predicate: (users: PresenceSyncEvent['users']) => boolean,
  ms = 2000,
): Promise<PresenceSyncEvent['users']> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for presence')), ms);
    const handler = (payload: PresenceSyncEvent): void => {
      if (predicate(payload.users)) {
        clearTimeout(timer);
        client.off(SOCKET_EVENTS.PRESENCE_SYNC, handler);
        resolve(payload.users);
      }
    };
    client.on(SOCKET_EVENTS.PRESENCE_SYNC, handler);
  });
}

async function seedBoard() {
  const owner = await createUser('Ada Owner', 'ada@example.com');
  const workspace = await createWorkspace(owner.user.id, { name: 'Acme' });
  const board = await createBoard(workspace.id, owner.user.id, { title: 'Sprint' });
  const column = await createColumn(board.id, owner.user.id, { title: 'To Do' });
  return { owner, workspace, board, column };
}

describe('board socket: room authorization', () => {
  it('rejects a join from a non-member', async () => {
    const { board } = await seedBoard();
    const outsider = await createUser('Eve Outsider', 'eve@example.com');

    const client = connect(outsider.token);
    await waitConnect(client);
    const result = await joinBoard(client, board.id);
    client.close();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not a member/i);
  });

  it('admits a workspace member', async () => {
    const { owner, workspace, board } = await seedBoard();
    const member = await createUser('Bob Member', 'bob@example.com');
    await addMember(workspace.id, owner.user.id, { email: 'bob@example.com' });

    const client = connect(member.token);
    await waitConnect(client);
    const result = await joinBoard(client, board.id);
    client.close();

    expect(result.ok).toBe(true);
  });
});

describe('board socket: mutation broadcasts', () => {
  it('delivers a card-created event to another client in the room', async () => {
    const { owner, workspace, board, column } = await seedBoard();
    const member = await createUser('Bob Member', 'bob@example.com');
    await addMember(workspace.id, owner.user.id, { email: 'bob@example.com' });

    const ownerClient = connect(owner.token);
    const memberClient = connect(member.token);
    await Promise.all([waitConnect(ownerClient), waitConnect(memberClient)]);
    await Promise.all([joinBoard(ownerClient, board.id), joinBoard(memberClient, board.id)]);

    const received = waitForEvent<CardEvent>(memberClient, SOCKET_EVENTS.CARD_CREATED);
    const created = await createCard(column.id, owner.user.id, { title: 'Wire up realtime' });
    const event = await received;

    ownerClient.close();
    memberClient.close();

    expect(event.boardId).toBe(board.id);
    expect(event.actorId).toBe(owner.user.id);
    expect(event.card.id).toBe(created.id);
    expect(event.card.title).toBe('Wire up realtime');
  });
});

describe('board socket: comment and activity broadcasts', () => {
  it('delivers comment-created and activity-created events to another client in the room', async () => {
    const { owner, workspace, board, column } = await seedBoard();
    const member = await createUser('Bob Member', 'bob@example.com');
    await addMember(workspace.id, owner.user.id, { email: 'bob@example.com' });
    const card = await createCard(column.id, owner.user.id, { title: 'Wire up realtime' });

    const ownerClient = connect(owner.token);
    const memberClient = connect(member.token);
    await Promise.all([waitConnect(ownerClient), waitConnect(memberClient)]);
    await Promise.all([joinBoard(ownerClient, board.id), joinBoard(memberClient, board.id)]);

    const receivedComment = waitForEvent<CommentEvent>(memberClient, SOCKET_EVENTS.COMMENT_CREATED);
    const receivedActivity = waitForEvent<ActivityCreatedEvent>(memberClient, SOCKET_EVENTS.ACTIVITY_CREATED);
    const comment = await createComment(card.id, owner.user.id, { body: 'Looks good to me' });
    const [commentEvent, activityEvent] = await Promise.all([receivedComment, receivedActivity]);

    ownerClient.close();
    memberClient.close();

    expect(commentEvent.boardId).toBe(board.id);
    expect(commentEvent.cardId).toBe(card.id);
    expect(commentEvent.comment.id).toBe(comment.id);
    expect(commentEvent.comment.body).toBe('Looks good to me');

    expect(activityEvent.boardId).toBe(board.id);
    expect(activityEvent.activity.type).toBe('card_commented');
    expect(activityEvent.activity.metadata.cardId).toBe(card.id);
  });
});

describe('board socket: presence', () => {
  it('adds and removes viewers as they join and leave', async () => {
    const { owner, workspace, board } = await seedBoard();
    const member = await createUser('Bob Member', 'bob@example.com');
    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: member.user.id, role: 'MEMBER' },
    });

    const ownerClient = connect(owner.token);
    await waitConnect(ownerClient);
    await joinBoard(ownerClient, board.id);

    // Owner sees both once the member joins.
    const bothPresent = waitForPresence(ownerClient, (users) => users.length === 2);
    const memberClient = connect(member.token);
    await waitConnect(memberClient);
    await joinBoard(memberClient, board.id);
    const both = await bothPresent;
    expect(both.map((u) => u.userId).sort()).toEqual([owner.user.id, member.user.id].sort());

    // Owner sees just themselves again once the member disconnects.
    const aloneAgain = waitForPresence(ownerClient, (users) => users.length === 1);
    memberClient.close();
    const alone = await aloneAgain;
    expect(alone.map((u) => u.userId)).toEqual([owner.user.id]);

    ownerClient.close();
  });
});
