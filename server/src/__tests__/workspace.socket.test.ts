import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  WorkspaceMemberEvent,
  WorkspaceMemberRemovedEvent,
} from '@taskflow/shared';
import { SOCKET_EVENTS } from '@taskflow/shared';
import { prisma } from '../services/prisma';
import { hashPassword } from '../services/password';
import { signAccessToken } from '../services/jwt';
import { createWorkspace, addMember, updateMemberRole, removeMember } from '../services/workspaces';
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

function joinWorkspace(client: ClientSocket, workspaceId: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    client.emit(SOCKET_EVENTS.WORKSPACE_JOIN, { workspaceId }, (result) => {
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

async function seedWorkspace() {
  const owner = await createUser('Ada Owner', 'ada@example.com');
  const workspace = await createWorkspace(owner.user.id, { name: 'Acme' });
  return { owner, workspace };
}

describe('workspace socket: room authorization', () => {
  it('rejects a join from a non-member', async () => {
    const { workspace } = await seedWorkspace();
    const outsider = await createUser('Eve Outsider', 'eve@example.com');

    const client = connect(outsider.token);
    await waitConnect(client);
    const result = await joinWorkspace(client, workspace.id);
    client.close();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not a member/i);
  });

  it('admits a workspace member', async () => {
    const { owner, workspace } = await seedWorkspace();
    const member = await createUser('Bob Member', 'bob@example.com');
    await addMember(workspace.id, owner.user.id, { email: 'bob@example.com' });

    const client = connect(member.token);
    await waitConnect(client);
    const result = await joinWorkspace(client, workspace.id);
    client.close();

    expect(result.ok).toBe(true);
  });
});

describe('workspace socket: membership broadcasts', () => {
  it('delivers a member-added event to another client in the room', async () => {
    const { owner, workspace } = await seedWorkspace();
    await createUser('Bob Member', 'bob@example.com');

    const ownerClient = connect(owner.token);
    await waitConnect(ownerClient);
    await joinWorkspace(ownerClient, workspace.id);

    const received = waitForEvent<WorkspaceMemberEvent>(ownerClient, SOCKET_EVENTS.WORKSPACE_MEMBER_ADDED);
    const added = await addMember(workspace.id, owner.user.id, { email: 'bob@example.com' });
    const event = await received;

    ownerClient.close();

    expect(event.workspaceId).toBe(workspace.id);
    expect(event.actorId).toBe(owner.user.id);
    expect(event.member.id).toBe(added.id);
    expect(event.member.role).toBe('MEMBER');
  });

  it('delivers a member-updated event when a role changes', async () => {
    const { owner, workspace } = await seedWorkspace();
    await createUser('Bob Member', 'bob@example.com');
    const member = await addMember(workspace.id, owner.user.id, { email: 'bob@example.com' });

    const ownerClient = connect(owner.token);
    await waitConnect(ownerClient);
    await joinWorkspace(ownerClient, workspace.id);

    const received = waitForEvent<WorkspaceMemberEvent>(ownerClient, SOCKET_EVENTS.WORKSPACE_MEMBER_UPDATED);
    await updateMemberRole(workspace.id, owner.user.id, member.id, { role: 'VIEWER' });
    const event = await received;

    ownerClient.close();

    expect(event.member.id).toBe(member.id);
    expect(event.member.role).toBe('VIEWER');
  });

  it('delivers a member-removed event to another client in the room', async () => {
    const { owner, workspace } = await seedWorkspace();
    const bob = await createUser('Bob Member', 'bob@example.com');
    const member = await addMember(workspace.id, owner.user.id, { email: 'bob@example.com' });

    const ownerClient = connect(owner.token);
    await waitConnect(ownerClient);
    await joinWorkspace(ownerClient, workspace.id);

    const received = waitForEvent<WorkspaceMemberRemovedEvent>(ownerClient, SOCKET_EVENTS.WORKSPACE_MEMBER_REMOVED);
    await removeMember(workspace.id, owner.user.id, member.id);
    const event = await received;

    ownerClient.close();

    expect(event.workspaceId).toBe(workspace.id);
    expect(event.userId).toBe(bob.user.id);
  });
});
