import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { BoardAnalytics } from '@taskflow/shared';
import { createApp } from '../app';
import { prisma } from '../services/prisma';

const app = createApp();

beforeEach(async () => {
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

async function registerUser(name: string, email: string) {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'Password123!' });
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

async function createCard(
  token: string,
  columnId: string,
  title: string,
  extra: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post(`/api/columns/${columnId}/cards`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title, ...extra });
  return res.body;
}

async function moveCard(token: string, cardId: string, columnId: string, index = 0) {
  return request(app)
    .patch(`/api/cards/${cardId}/move`)
    .set('Authorization', `Bearer ${token}`)
    .send({ columnId, index });
}

function getAnalytics(token: string, boardId: string, weeks?: number) {
  const path = `/api/boards/${boardId}/analytics${weeks === undefined ? '' : `?weeks=${weeks}`}`;
  return request(app).get(path).set('Authorization', `Bearer ${token}`);
}

describe('Board analytics', () => {
  it('summarizes status, priority, assignee, completion and overdue counts', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const bob = await registerUser('Bob', 'bob@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'bob@example.com');
    const board = await createBoard(owner.token, workspace.id);
    const todo = await createColumn(owner.token, board.id, 'To Do');
    const inProgress = await createColumn(owner.token, board.id, 'In Progress');
    const done = await createColumn(owner.token, board.id, 'Done');

    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    await createCard(owner.token, todo.id, 'Overdue unassigned', { priority: 'HIGH', dueDate: yesterday });
    await createCard(owner.token, inProgress.id, 'In progress for Bob', { priority: 'URGENT', assigneeId: bob.user.id });
    const toFinish = await createCard(owner.token, todo.id, 'Finish me', { priority: 'LOW' });
    await moveCard(owner.token, toFinish.id, done.id, 0);

    const res = await getAnalytics(owner.token, board.id);
    expect(res.status).toBe(200);
    const analytics = res.body as BoardAnalytics;

    expect(analytics.totalCards).toBe(3);
    expect(analytics.doneColumnTitle).toBe('Done');
    expect(analytics.completedCount).toBe(1);
    expect(analytics.overdueCount).toBe(1);

    const statusByTitle = Object.fromEntries(analytics.cardsByStatus.map((s) => [s.columnTitle, s.count]));
    expect(statusByTitle).toEqual({ 'To Do': 1, 'In Progress': 1, Done: 1 });

    const priorityByName = Object.fromEntries(analytics.cardsByPriority.map((p) => [p.priority, p.count]));
    expect(priorityByName).toEqual({ LOW: 1, MEDIUM: 0, HIGH: 1, URGENT: 1 });

    const bobBucket = analytics.cardsByAssignee.find((a) => a.assigneeId === bob.user.id);
    const unassigned = analytics.cardsByAssignee.find((a) => a.assigneeId === null);
    expect(bobBucket?.count).toBe(1);
    expect(bobBucket?.name).toBe('Bob');
    expect(unassigned?.count).toBe(2);
  });

  it('counts a completed card in the current throughput week and reports a cycle time', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const todo = await createColumn(owner.token, board.id, 'To Do');
    const done = await createColumn(owner.token, board.id, 'Done');

    const card = await createCard(owner.token, todo.id, 'Ship it');
    await moveCard(owner.token, card.id, done.id, 0);

    const res = await getAnalytics(owner.token, board.id, 4);
    const analytics = res.body as BoardAnalytics;

    expect(analytics.weeks).toBe(4);
    expect(analytics.throughput).toHaveLength(4);
    const totalCompleted = analytics.throughput.reduce((sum, week) => sum + week.completed, 0);
    expect(totalCompleted).toBe(1);
    // The most recent bucket is last; the card completed this week.
    expect(analytics.throughput[analytics.throughput.length - 1]?.completed).toBe(1);
    expect(analytics.cycleTime.sampleSize).toBe(1);
    expect(analytics.cycleTime.averageDays).toBeGreaterThanOrEqual(0);
  });

  it('clamps the weeks query parameter to the supported range', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);

    const tooMany = await getAnalytics(owner.token, board.id, 999);
    expect((tooMany.body as BoardAnalytics).weeks).toBe(26);

    const tooFew = await getAnalytics(owner.token, board.id, 0);
    expect((tooFew.body as BoardAnalytics).weeks).toBe(1); // 0 clamps up to the minimum

    const defaulted = await getAnalytics(owner.token, board.id);
    expect((defaulted.body as BoardAnalytics).weeks).toBe(8); // omitted -> default
  });

  it('handles a board with no columns gracefully', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);

    const res = await getAnalytics(owner.token, board.id);
    const analytics = res.body as BoardAnalytics;
    expect(res.status).toBe(200);
    expect(analytics.totalCards).toBe(0);
    expect(analytics.doneColumnId).toBeNull();
    expect(analytics.completedCount).toBe(0);
    expect(analytics.cycleTime.averageDays).toBeNull();
  });

  it('allows a read-only VIEWER but rejects a non-member with 403', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const viewer = await registerUser('Vic', 'vic@example.com');
    const outsider = await registerUser('Eve', 'eve@example.com');
    const workspace = await createWorkspace(owner.token);
    await addMember(owner.token, workspace.id, 'vic@example.com', 'VIEWER');
    const board = await createBoard(owner.token, workspace.id);

    const viewerRes = await getAnalytics(viewer.token, board.id);
    expect(viewerRes.status).toBe(200);

    const outsiderRes = await getAnalytics(outsider.token, board.id);
    expect(outsiderRes.status).toBe(403);

    const unauth = await request(app).get(`/api/boards/${board.id}/analytics`);
    expect(unauth.status).toBe(401);
  });
});
