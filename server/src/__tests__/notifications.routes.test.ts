import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../services/prisma';

const app = createApp();

beforeEach(async () => {
  // Workspace.ownerId is ON DELETE RESTRICT, so child rows must go first.
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

async function registerUser(name: string, email: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Password123!' });
  return { token: res.body.token as string, user: res.body.user };
}

async function createWorkspace(token: string, name = 'Acme Inc') {
  const res = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${token}`).send({ name });
  return res.body;
}

async function addMember(token: string, workspaceId: string, email: string, role?: string) {
  return request(app)
    .post(`/api/workspaces/${workspaceId}/members`)
    .set('Authorization', `Bearer ${token}`)
    .send(role ? { email, role } : { email });
}

async function createBoard(token: string, workspaceId: string, title = 'Sprint Board') {
  const res = await request(app)
    .post(`/api/workspaces/${workspaceId}/boards`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title });
  return res.body;
}

async function createColumn(token: string, boardId: string, title: string) {
  const res = await request(app)
    .post(`/api/boards/${boardId}/columns`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title });
  return res.body;
}

async function createCard(token: string, columnId: string, title: string) {
  const res = await request(app)
    .post(`/api/columns/${columnId}/cards`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title });
  return res.body;
}

async function assignCard(token: string, cardId: string, assigneeId: string) {
  return request(app).patch(`/api/cards/${cardId}`).set('Authorization', `Bearer ${token}`).send({ assigneeId });
}

async function postComment(token: string, cardId: string, body: string) {
  return request(app).post(`/api/cards/${cardId}/comments`).set('Authorization', `Bearer ${token}`).send({ body });
}

async function listNotifications(token: string) {
  return request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
}

interface NotificationRow {
  id: string;
  type: string;
  actorId: string;
  isRead: boolean;
  metadata: { cardId: string };
}

describe('Notifications: mentions', () => {
  it('notifies a @mentioned workspace member, but not the comment author themselves', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const comment = await postComment(owner.token, card.id, `Hey @[${bob.user.name}](${bob.user.id}) check this out`);
    expect(comment.status).toBe(201);

    const bobList = await listNotifications(bob.token);
    expect(bobList.body).toHaveLength(1);
    expect(bobList.body[0]).toMatchObject({ type: 'mention', actorId: owner.user.id, isRead: false });
    expect(bobList.body[0].metadata.cardId).toBe(card.id);

    const ownerList = await listNotifications(owner.token);
    expect(ownerList.body).toHaveLength(0);
  });

  it('does not notify when a user mentions themselves', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    await postComment(owner.token, card.id, `@[${owner.user.name}](${owner.user.id}) note to self`);

    const ownerList = await listNotifications(owner.token);
    expect(ownerList.body).toHaveLength(0);
  });

  it('ignores a mention of someone who is not a workspace member', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const create = await postComment(owner.token, card.id, `@[${outsider.user.name}](${outsider.user.id}) hello?`);
    expect(create.status).toBe(201);

    const outsiderList = await listNotifications(outsider.token);
    expect(outsiderList.body).toHaveLength(0);
  });
});

describe('Notifications: assignment', () => {
  it('notifies a member when assigned to a card', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    await assignCard(owner.token, card.id, bob.user.id);

    const bobList = await listNotifications(bob.token);
    expect(bobList.body).toHaveLength(1);
    expect(bobList.body[0]).toMatchObject({ type: 'assignment', actorId: owner.user.id });
  });

  it('does not notify when assigning a card to yourself', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    await assignCard(owner.token, card.id, owner.user.id);

    const ownerList = await listNotifications(owner.token);
    expect(ownerList.body).toHaveLength(0);
  });
});

describe('Notifications: comments on an assigned card', () => {
  it('notifies the assignee when someone else comments', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');
    await assignCard(owner.token, card.id, bob.user.id);

    await postComment(owner.token, card.id, 'progress update');

    const bobList = await listNotifications(bob.token);
    const types = bobList.body.map((n: NotificationRow) => n.type).sort();
    expect(types).toEqual(['assignment', 'comment']);
  });

  it('does not double-notify the assignee when they are also mentioned in the same comment', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');
    await assignCard(owner.token, card.id, bob.user.id);

    await postComment(owner.token, card.id, `@[${bob.user.name}](${bob.user.id}) thoughts?`);

    const bobList = await listNotifications(bob.token);
    const types = bobList.body.map((n: NotificationRow) => n.type).sort();
    expect(types).toEqual(['assignment', 'mention']);
  });

  it('does not notify the assignee about their own comment', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');
    await assignCard(owner.token, card.id, bob.user.id);

    await postComment(bob.token, card.id, 'working on it');

    const bobList = await listNotifications(bob.token);
    expect(bobList.body.some((n: NotificationRow) => n.type === 'comment')).toBe(false);
  });
});

describe('Notifications: list, mark read, mark all read', () => {
  it('returns notifications newest first', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card1 = await createCard(owner.token, column.id, 'Card 1');
    const card2 = await createCard(owner.token, column.id, 'Card 2');

    await assignCard(owner.token, card1.id, bob.user.id);
    await assignCard(owner.token, card2.id, bob.user.id);

    const list = await listNotifications(bob.token);
    expect(list.body.map((n: NotificationRow) => n.metadata.cardId)).toEqual([card2.id, card1.id]);
  });

  it('marks a notification read, scoped to its own recipient', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');
    await assignCard(owner.token, card.id, bob.user.id);

    const list = await listNotifications(bob.token);
    const notificationId = list.body[0].id;

    const deniedRead = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(deniedRead.status).toBe(403);

    const ownRead = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(ownRead.status).toBe(200);
    expect(ownRead.body.isRead).toBe(true);
  });

  it('returns 404 marking a notification that does not exist', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const res = await request(app)
      .patch('/api/notifications/does-not-exist/read')
      .set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(404);
  });

  it('marks all of one user notifications read without touching another user', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const carol = await registerUser('Carol', 'carol@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    await addMember(owner.token, workspace.id, 'carol@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card1 = await createCard(owner.token, column.id, 'Card 1');
    const card2 = await createCard(owner.token, column.id, 'Card 2');
    await assignCard(owner.token, card1.id, bob.user.id);
    await assignCard(owner.token, card2.id, carol.user.id);

    const readAll = await request(app).post('/api/notifications/read-all').set('Authorization', `Bearer ${bob.token}`);
    expect(readAll.status).toBe(204);

    const bobList = await listNotifications(bob.token);
    expect(bobList.body.every((n: NotificationRow) => n.isRead)).toBe(true);

    const carolList = await listNotifications(carol.token);
    expect(carolList.body.every((n: NotificationRow) => n.isRead)).toBe(false);
  });

  it('requires authentication to list, read, or mark-all-read', async () => {
    const list = await request(app).get('/api/notifications');
    expect(list.status).toBe(401);
    const readAll = await request(app).post('/api/notifications/read-all');
    expect(readAll.status).toBe(401);
  });
});
