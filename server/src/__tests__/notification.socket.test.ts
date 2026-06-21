import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, NotificationCreatedEvent, ServerToClientEvents } from '@taskflow/shared';
import { SOCKET_EVENTS } from '@taskflow/shared';
import { prisma } from '../services/prisma';
import { hashPassword } from '../services/password';
import { signAccessToken } from '../services/jwt';
import { createWorkspace, addMember } from '../services/workspaces';
import { createBoard } from '../services/boards';
import { createColumn } from '../services/columns';
import { createCard, updateCard } from '../services/cards';
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

/** Resolve `true` if `name` fires within `ms`, `false` if it never does (used to assert a non-delivery). */
function eventNeverFires(client: ClientSocket, name: keyof ServerToClientEvents, ms = 300): Promise<boolean> {
  return new Promise((resolve) => {
    const handler = (): void => resolve(false);
    client.once(name, handler);
    setTimeout(() => {
      client.off(name, handler);
      resolve(true);
    }, ms);
  });
}

async function seedAssignableCard() {
  const owner = await createUser('Ada Owner', 'ada@example.com');
  const recipient = await createUser('Bob Recipient', 'bob@example.com');
  const bystander = await createUser('Carol Bystander', 'carol@example.com');
  const workspace = await createWorkspace(owner.user.id, { name: 'Acme' });
  await addMember(workspace.id, owner.user.id, { email: recipient.user.email });
  await addMember(workspace.id, owner.user.id, { email: bystander.user.email });
  const board = await createBoard(workspace.id, owner.user.id, { title: 'Board' });
  const column = await createColumn(board.id, owner.user.id, { title: 'To Do' });
  const card = await createCard(column.id, owner.user.id, { title: 'Card 1' });
  return { owner, recipient, bystander, workspace, board, card };
}

describe('notification socket delivery', () => {
  it('delivers a notification only to the recipient, with no explicit room-join required', async () => {
    const { owner, recipient, bystander, card } = await seedAssignableCard();

    const recipientClient = connect(recipient.token);
    const bystanderClient = connect(bystander.token);
    await Promise.all([waitConnect(recipientClient), waitConnect(bystanderClient)]);

    const received = waitForEvent<NotificationCreatedEvent>(recipientClient, SOCKET_EVENTS.NOTIFICATION_CREATED);
    const neverArrivesForBystander = eventNeverFires(bystanderClient, SOCKET_EVENTS.NOTIFICATION_CREATED);

    await updateCard(card.id, owner.user.id, { assigneeId: recipient.user.id });

    const event = await received;
    expect(await neverArrivesForBystander).toBe(true);

    recipientClient.close();
    bystanderClient.close();

    expect(event.notification.type).toBe('assignment');
    expect(event.notification.userId).toBe(recipient.user.id);
    expect(event.notification.actorId).toBe(owner.user.id);
    expect(event.notification.metadata.cardId).toBe(card.id);
  });

  it('does not deliver a notification to its own actor', async () => {
    const { owner, recipient, card } = await seedAssignableCard();

    const ownerClient = connect(owner.token);
    await waitConnect(ownerClient);
    const neverArrivesForOwner = eventNeverFires(ownerClient, SOCKET_EVENTS.NOTIFICATION_CREATED);

    await updateCard(card.id, owner.user.id, { assigneeId: recipient.user.id });

    expect(await neverArrivesForOwner).toBe(true);
    ownerClient.close();
  });
});
