import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../services/prisma';
import { getAiService } from '../services/ai';

// The default test environment configures no AI provider (AI_PROVIDER is unset),
// so this file exercises the graceful-degradation contract: AI is fully inert.
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

describe('AI disabled (no provider configured)', () => {
  it('the AI service reports itself disabled', () => {
    expect(getAiService().isEnabled()).toBe(false);
    expect(getAiService().provider).toBe('none');
  });

  it('health reports AI as disabled', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.ai).toEqual({ enabled: false, provider: 'none' });
  });

  it('every AI endpoint is inactive (404) even for an authorized member', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Card 1');

    const endpoints = [
      request(app).post(`/api/ai/boards/${board.id}/summary`).set('Authorization', `Bearer ${owner.token}`),
      request(app)
        .post(`/api/ai/workspaces/${workspace.id}/draft-description`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: 'Anything' }),
      request(app).post(`/api/ai/cards/${card.id}/subtasks`).set('Authorization', `Bearer ${owner.token}`),
      request(app).post(`/api/ai/cards/${card.id}/suggestions`).set('Authorization', `Bearer ${owner.token}`),
    ];

    for (const endpoint of endpoints) {
      const res = await endpoint;
      expect(res.status).toBe(404);
    }
  });

  it('still requires authentication before reporting AI as unavailable', async () => {
    const res = await request(app).post('/api/ai/boards/some-board/summary');
    expect(res.status).toBe(401);
  });

  it('the rest of the app is fully functional with AI off', async () => {
    const owner = await registerUser('Ada', 'ada@example.com');
    const workspace = await createWorkspace(owner.token);
    const board = await createBoard(owner.token, workspace.id);
    const column = await createColumn(owner.token, board.id, 'To Do');
    const card = await createCard(owner.token, column.id, 'Ship it');

    const boardRes = await request(app).get(`/api/boards/${board.id}`).set('Authorization', `Bearer ${owner.token}`);
    expect(boardRes.status).toBe(200);
    expect(boardRes.body.columns[0].cards[0].title).toBe('Ship it');
    expect(card.id).toBeTypeOf('string');
  });
});
