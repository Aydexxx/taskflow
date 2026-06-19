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

async function addMember(token: string, workspaceId: string, email: string) {
  return request(app)
    .post(`/api/workspaces/${workspaceId}/members`)
    .set('Authorization', `Bearer ${token}`)
    .send({ email });
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

async function createLabel(token: string, workspaceId: string, name: string, color = 'red') {
  const res = await request(app)
    .post(`/api/workspaces/${workspaceId}/labels`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name, color });
  return res.body;
}

describe('Workspaces', () => {
  it('creates a workspace and makes the creator its OWNER member', async () => {
    const { token, user } = await registerUser('Ada', 'ada@example.com');

    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Acme Inc' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Acme Inc', ownerId: user.id });
    expect(res.body.slug).toBeTypeOf('string');

    const membersRes = await request(app)
      .get(`/api/workspaces/${res.body.id}/members`)
      .set('Authorization', `Bearer ${token}`);
    expect(membersRes.body).toHaveLength(1);
    expect(membersRes.body[0]).toMatchObject({ userId: user.id, role: 'OWNER' });
  });

  it('lists only the caller\'s workspaces', async () => {
    const ada = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    await createWorkspace(ada.token, 'Ada Workspace');
    await createWorkspace(bob.token, 'Bob Workspace');

    const res = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${ada.token}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Ada Workspace');
  });

  it('returns 403 when a non-member reads a workspace', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);

    const res = await request(app)
      .get(`/api/workspaces/${workspace.id}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(res.status).toBe(403);
  });

  it('lets the owner rename the workspace but rejects other members', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const member = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');

    const denied = await request(app)
      .patch(`/api/workspaces/${workspace.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: 'Hacked' });
    expect(denied.status).toBe(403);

    const res = await request(app)
      .patch(`/api/workspaces/${workspace.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed');
  });

  it('lets the owner delete the workspace but rejects other members', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const member = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');

    const denied = await request(app)
      .delete(`/api/workspaces/${workspace.id}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(denied.status).toBe(403);

    const res = await request(app)
      .delete(`/api/workspaces/${workspace.id}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(204);
  });

  it('adds a member by email, rejecting duplicates and unknown emails', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);

    const res = await addMember(owner.token, workspace.id, 'bob@example.com');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role: 'MEMBER' });
    expect(res.body.user.email).toBe('bob@example.com');

    const dup = await addMember(owner.token, workspace.id, 'bob@example.com');
    expect(dup.status).toBe(409);

    const unknown = await addMember(owner.token, workspace.id, 'nobody@example.com');
    expect(unknown.status).toBe(404);
  });

  it('returns 403 when a non-member tries to add a member', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);

    const res = await addMember(outsider.token, workspace.id, 'eve@example.com');
    expect(res.status).toBe(403);
  });
});

describe('Boards', () => {
  it('creates a board within a workspace and lists it', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);

    const res = await request(app)
      .post(`/api/workspaces/${workspace.id}/boards`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Sprint 1', description: 'Q1 sprint' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Sprint 1', workspaceId: workspace.id });

    const listRes = await request(app)
      .get(`/api/workspaces/${workspace.id}/boards`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(listRes.body).toHaveLength(1);
  });

  it('returns 403 when a non-member creates a board', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);

    const res = await request(app)
      .post(`/api/workspaces/${workspace.id}/boards`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ title: 'Sneaky board' });
    expect(res.status).toBe(403);
  });

  it('gets a board with nested columns and cards', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    await createCard(owner.token, column.id, 'Write tests');

    const res = await request(app).get(`/api/boards/${board.id}`).set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body.columns).toHaveLength(1);
    expect(res.body.columns[0].cards).toHaveLength(1);
    expect(res.body.columns[0].cards[0].title).toBe('Write tests');
  });

  it('returns 403 when a non-member reads, updates, or deletes a board', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);

    const get = await request(app).get(`/api/boards/${board.id}`).set('Authorization', `Bearer ${outsider.token}`);
    expect(get.status).toBe(403);

    const update = await request(app)
      .patch(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ title: 'Hacked' });
    expect(update.status).toBe(403);

    const del = await request(app).delete(`/api/boards/${board.id}`).set('Authorization', `Bearer ${outsider.token}`);
    expect(del.status).toBe(403);
  });

  it('updates and deletes a board', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);

    const update = await request(app)
      .patch(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Renamed board' });
    expect(update.status).toBe(200);
    expect(update.body.title).toBe('Renamed board');

    const del = await request(app).delete(`/api/boards/${board.id}`).set('Authorization', `Bearer ${owner.token}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/boards/${board.id}`).set('Authorization', `Bearer ${owner.token}`);
    expect(get.status).toBe(404);
  });
});

describe('Columns', () => {
  it('appends columns in order and supports renaming', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);

    const c1 = await createColumn(owner.token, board.id, 'To Do');
    const c2 = await createColumn(owner.token, board.id, 'Doing');
    const c3 = await createColumn(owner.token, board.id, 'Done');
    expect(c1.position).toBeLessThan(c2.position);
    expect(c2.position).toBeLessThan(c3.position);

    const rename = await request(app)
      .patch(`/api/columns/${c2.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'In Progress' });
    expect(rename.status).toBe(200);
    expect(rename.body.title).toBe('In Progress');
  });

  it('reorders a column by index, only touching the moved row', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const c1 = await createColumn(owner.token, board.id, 'To Do');
    const c2 = await createColumn(owner.token, board.id, 'Doing');
    const c3 = await createColumn(owner.token, board.id, 'Done');

    const res = await request(app)
      .patch(`/api/columns/${c3.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ index: 0 });
    expect(res.status).toBe(200);

    const boardRes = await request(app).get(`/api/boards/${board.id}`).set('Authorization', `Bearer ${owner.token}`);
    const orderedIds = boardRes.body.columns.map((c: { id: string }) => c.id);
    expect(orderedIds).toEqual([c3.id, c1.id, c2.id]);

    const c1Res = boardRes.body.columns.find((c: { id: string }) => c.id === c1.id);
    const c2Res = boardRes.body.columns.find((c: { id: string }) => c.id === c2.id);
    expect(c1Res.position).toBe(c1.position);
    expect(c2Res.position).toBe(c2.position);
  });

  it('deletes a column', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');

    const res = await request(app).delete(`/api/columns/${column.id}`).set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 when a non-member mutates a column', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');

    const rename = await request(app)
      .patch(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ title: 'Hacked' });
    expect(rename.status).toBe(403);

    const del = await request(app)
      .delete(`/api/columns/${column.id}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(del.status).toBe(403);
  });
});

describe('Cards', () => {
  it('appends cards in order and updates fields', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');

    const card1 = await createCard(owner.token, column.id, 'Card 1');
    const card2 = await createCard(owner.token, column.id, 'Card 2');
    expect(card1.position).toBeLessThan(card2.position);

    const update = await request(app)
      .patch(`/api/cards/${card1.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Card 1 updated', description: 'Details' });
    expect(update.status).toBe(200);
    expect(update.body).toMatchObject({ title: 'Card 1 updated', description: 'Details' });
  });

  it('assigns a card to a workspace member but rejects a non-member assignee', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const member = await registerUser('Bob', 'bob@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const assignOk = await request(app)
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assigneeId: member.user.id });
    expect(assignOk.status).toBe(200);
    expect(assignOk.body.assigneeId).toBe(member.user.id);

    const assignBad = await request(app)
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assigneeId: outsider.user.id });
    expect(assignBad.status).toBe(400);
  });

  it('moves a card within the same column (reorder)', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card1 = await createCard(owner.token, column.id, 'Card 1');
    const card2 = await createCard(owner.token, column.id, 'Card 2');
    const card3 = await createCard(owner.token, column.id, 'Card 3');

    const move = await request(app)
      .patch(`/api/cards/${card3.id}/move`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ columnId: column.id, index: 0 });
    expect(move.status).toBe(200);

    const boardRes = await request(app).get(`/api/boards/${board.id}`).set('Authorization', `Bearer ${owner.token}`);
    const ids = boardRes.body.columns[0].cards.map((c: { id: string }) => c.id);
    expect(ids).toEqual([card3.id, card1.id, card2.id]);
  });

  it('moves a card to a different column, updating only that card', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const todo = await createColumn(owner.token, board.id, 'To Do');
    const done = await createColumn(owner.token, board.id, 'Done');
    const card1 = await createCard(owner.token, todo.id, 'Card 1');
    const card2 = await createCard(owner.token, todo.id, 'Card 2');
    const existingDoneCard = await createCard(owner.token, done.id, 'Existing done card');

    const move = await request(app)
      .patch(`/api/cards/${card1.id}/move`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ columnId: done.id, index: 0 });
    expect(move.status).toBe(200);
    expect(move.body.columnId).toBe(done.id);

    const boardRes = await request(app).get(`/api/boards/${board.id}`).set('Authorization', `Bearer ${owner.token}`);
    const todoColumn = boardRes.body.columns.find((c: { id: string }) => c.id === todo.id);
    const doneColumn = boardRes.body.columns.find((c: { id: string }) => c.id === done.id);

    expect(todoColumn.cards.map((c: { id: string }) => c.id)).toEqual([card2.id]);
    expect(todoColumn.cards[0].position).toBe(card2.position);
    expect(doneColumn.cards.map((c: { id: string }) => c.id)).toEqual([card1.id, existingDoneCard.id]);
  });

  it('rejects moving a card to a column in a different workspace', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const otherOwner = await registerUser('Carl', 'carl@example.com');
    const workspace = await createWorkspace(owner.token);
    const otherWorkspace = await createWorkspace(otherOwner.token, 'Other workspace');
    const board = await createBoard(owner.token, workspace.id);
    const otherBoard = await createBoard(otherOwner.token, otherWorkspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const otherColumn = await createColumn(otherOwner.token, otherBoard.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const move = await request(app)
      .patch(`/api/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ columnId: otherColumn.id, index: 0 });
    expect(move.status).toBe(400);
  });

  it('deletes a card', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const res = await request(app).delete(`/api/cards/${card.id}`).set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 when a non-member mutates a card', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const update = await request(app)
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ title: 'Hacked' });
    expect(update.status).toBe(403);

    const move = await request(app)
      .patch(`/api/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ columnId: column.id, index: 0 });
    expect(move.status).toBe(403);

    const del = await request(app).delete(`/api/cards/${card.id}`).set('Authorization', `Bearer ${outsider.token}`);
    expect(del.status).toBe(403);
  });
});

describe('Labels', () => {
  it('creates a workspace label and attaches/detaches it from a card', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');
    const label = await createLabel(owner.token, workspace.id, 'Bug', 'red');
    expect(label).toMatchObject({ name: 'Bug', color: 'red', workspaceId: workspace.id });

    const attach = await request(app)
      .post(`/api/cards/${card.id}/labels`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ labelId: label.id });
    expect(attach.status).toBe(200);
    expect(attach.body.labels).toMatchObject([{ id: label.id, name: 'Bug' }]);

    const detach = await request(app)
      .delete(`/api/cards/${card.id}/labels/${label.id}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(detach.status).toBe(200);
    expect(detach.body.labels).toHaveLength(0);
  });

  it('returns 403 when a non-member creates or attaches a label', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');
    const label = await createLabel(owner.token, workspace.id, 'Bug', 'red');

    const createDenied = await request(app)
      .post(`/api/workspaces/${workspace.id}/labels`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ name: 'Sneaky', color: 'blue' });
    expect(createDenied.status).toBe(403);

    const attachDenied = await request(app)
      .post(`/api/cards/${card.id}/labels`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ labelId: label.id });
    expect(attachDenied.status).toBe(403);
  });
});

describe('Comments', () => {
  it('adds and lists a comment, then lets only its author delete it', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const member = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const create = await request(app)
      .post(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ body: 'Looks good' });
    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({ body: 'Looks good', cardId: card.id, authorId: owner.user.id });
    expect(create.body.author.id).toBe(owner.user.id);

    const list = await request(app)
      .get(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    const deniedDelete = await request(app)
      .delete(`/api/comments/${create.body.id}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(deniedDelete.status).toBe(403);

    const ownDelete = await request(app)
      .delete(`/api/comments/${create.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(ownDelete.status).toBe(204);
  });

  it('returns 403 when a non-member reads or adds comments', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const listDenied = await request(app)
      .get(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(listDenied.status).toBe(403);

    const createDenied = await request(app)
      .post(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ body: 'Sneaky comment' });
    expect(createDenied.status).toBe(403);
  });
});

describe('Activity', () => {
  it('records activity entries for card creation, assignment, moves, and comments', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const member = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const todo = await createColumn(owner.token, board.id, 'To Do');
    const done = await createColumn(owner.token, board.id, 'Done');
    const card = await createCard(owner.token, todo.id, 'Card 1');

    await request(app)
      .patch(`/api/cards/${card.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assigneeId: member.user.id });

    await request(app)
      .patch(`/api/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ columnId: done.id, index: 0 });

    await request(app)
      .post(`/api/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ body: 'Done!' });

    const res = await request(app)
      .get(`/api/boards/${board.id}/activity`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    const types = res.body.map((entry: { type: string }) => entry.type);
    // Column creation also logs activity; only the card-related entries (newest first) matter here.
    expect(types.slice(0, 4)).toEqual(['card_commented', 'card_moved', 'card_assigned', 'card_created']);
  });

  it('returns 403 when a non-member reads the activity feed', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);

    const res = await request(app)
      .get(`/api/boards/${board.id}/activity`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(res.status).toBe(403);
  });
});
