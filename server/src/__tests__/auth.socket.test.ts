import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';
import { prisma } from '../services/prisma';
import { hashPassword } from '../services/password';
import { signAccessToken } from '../services/jwt';
import { startSocketTestServer, type SocketTestServer } from '../test/socketTestServer';

let server: SocketTestServer;

beforeAll(async () => {
  server = await startSocketTestServer();
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
  // Workspace.ownerId is ON DELETE RESTRICT, so child rows must go first
  // in case an earlier test file left workspace fixtures behind.
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

function connect(auth?: Record<string, unknown>): Socket {
  // forceNew avoids socket.io-client reusing a cached Manager/transport across
  // tests in this same process, which would leak connection state between them.
  return ioClient(server.url, { transports: ['websocket'], autoConnect: false, forceNew: true, auth });
}

function waitForOutcome(client: Socket): Promise<{ connected: boolean; error?: string }> {
  return new Promise((resolve) => {
    client.on('connect', () => resolve({ connected: true }));
    client.on('connect_error', (err: Error) => resolve({ connected: false, error: err.message }));
    client.connect();
  });
}

describe('socket auth middleware', () => {
  it('rejects a connection with no token', async () => {
    const client = connect();
    const outcome = await waitForOutcome(client);
    client.close();

    expect(outcome.connected).toBe(false);
  });

  it('rejects a connection with an invalid token', async () => {
    const client = connect({ token: 'not-a-real-token' });
    const outcome = await waitForOutcome(client);
    client.close();

    expect(outcome.connected).toBe(false);
  });

  it('accepts a connection with a valid token', async () => {
    const passwordHash = await hashPassword('Password123!');
    const user = await prisma.user.create({
      data: { name: 'Ada Lovelace', email: 'ada-socket@example.com', passwordHash },
    });
    const token = signAccessToken(user.id);

    const client = connect({ token });
    const outcome = await waitForOutcome(client);
    client.close();

    expect(outcome.connected).toBe(true);
  });
});
