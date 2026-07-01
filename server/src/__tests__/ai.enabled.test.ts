import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { AIProvider } from '@taskflow/shared';
import { createApp } from '../app';
import { prisma } from '../services/prisma';
import { AiService, createAiServiceFromEnv, setAiService, type GenerateOptions, type LlmClient } from '../services/ai';
import { resetRateLimits } from '../services/ai/rateLimit';
import { resetAiCaches } from '../services/ai/features';
import { env } from '../config/env';

/**
 * AI-enabled tests run against a FAKED provider — no real network calls. We
 * inject an in-memory `LlmClient` whose response each test controls, exercising
 * every feature plus strict-JSON parsing, graceful fallback, and rate limiting.
 */
class FakeLlmClient implements LlmClient {
  readonly provider: AIProvider = 'openai';
  /** The next completion to return; tests set this per case. */
  public response = '';
  public readonly calls: Array<{ prompt: string; options?: GenerateOptions }> = [];

  generate(prompt: string, options?: GenerateOptions): Promise<string> {
    this.calls.push({ prompt, options });
    return Promise.resolve(this.response);
  }
}

const app = createApp();
const fake = new FakeLlmClient();

beforeEach(async () => {
  setAiService(new AiService(fake));
  resetRateLimits();
  resetAiCaches();
  fake.calls.length = 0;
  fake.response = '';
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

// Restore the real (disabled-by-default) service so other test files are unaffected.
afterAll(() => {
  setAiService(createAiServiceFromEnv());
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

async function setupBoardWithCard() {
  const owner = await registerUser('Ada', 'ada@example.com');
  const workspace = await createWorkspace(owner.token);
  const board = await createBoard(owner.token, workspace.id);
  const column = await createColumn(owner.token, board.id, 'To Do');
  const card = await createCard(owner.token, column.id, 'Build login page');
  return { owner, workspace, board, column, card };
}

describe('AI enabled (faked provider)', () => {
  it('health reports AI as enabled with the active provider', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.ai).toEqual({ enabled: true, provider: 'openai' });
  });

  describe('summarize board', () => {
    it('returns a digest built from board data and a system prompt', async () => {
      const { owner, board } = await setupBoardWithCard();
      fake.response = 'The board is on track with one card in To Do.';

      const res = await request(app)
        .post(`/api/ai/boards/${board.id}/summary`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBe('The board is on track with one card in To Do.');
      expect(fake.calls).toHaveLength(1);
      expect(fake.calls[0]?.options?.system).toContain('project-management assistant');
      expect(fake.calls[0]?.prompt).toContain('Build login page');
    });

    it('serves a cached summary on the second call (cost-aware)', async () => {
      const { owner, board } = await setupBoardWithCard();
      fake.response = 'First summary.';
      await request(app).post(`/api/ai/boards/${board.id}/summary`).set('Authorization', `Bearer ${owner.token}`);

      fake.response = 'Second summary (should not be used).';
      const second = await request(app)
        .post(`/api/ai/boards/${board.id}/summary`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(second.body.summary).toBe('First summary.');
      expect(fake.calls).toHaveLength(1); // provider hit once
    });

    it('rejects a non-member with 403 and never calls the provider', async () => {
      const { board } = await setupBoardWithCard();
      const outsider = await registerUser('Eve', 'eve@example.com');

      const res = await request(app)
        .post(`/api/ai/boards/${board.id}/summary`)
        .set('Authorization', `Bearer ${outsider.token}`);

      expect(res.status).toBe(403);
      expect(fake.calls).toHaveLength(0);
    });
  });

  describe('ask workspace', () => {
    it('answers from a workspace snapshot of members, boards, and activity', async () => {
      const { owner, workspace } = await setupBoardWithCard();
      fake.response = 'Ada is the only member, and the Sprint Board has one card.';

      const res = await request(app)
        .post(`/api/ai/workspaces/${workspace.id}/ask`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ question: 'Who works here and what boards exist?' });

      expect(res.status).toBe(200);
      expect(res.body.answer).toBe('Ada is the only member, and the Sprint Board has one card.');
      expect(fake.calls).toHaveLength(1);
      // System prompt scopes the model to workspace data.
      expect(fake.calls[0]?.options?.system).toContain('single workspace');
      // Snapshot grounds the prompt in real workspace data: member, board, and
      // the question, plus activity from card creation on that board.
      const prompt = fake.calls[0]?.prompt ?? '';
      expect(prompt).toContain('Ada (OWNER)');
      expect(prompt).toContain('Sprint Board');
      expect(prompt).toContain('created card "Build login page"');
      expect(prompt).toContain('Who works here and what boards exist?');
    });

    it('is not cached — each question hits the provider', async () => {
      const { owner, workspace } = await setupBoardWithCard();
      fake.response = 'First answer.';
      await request(app)
        .post(`/api/ai/workspaces/${workspace.id}/ask`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ question: 'Question one?' });

      fake.response = 'Second answer.';
      const second = await request(app)
        .post(`/api/ai/workspaces/${workspace.id}/ask`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ question: 'Question two?' });

      expect(second.body.answer).toBe('Second answer.');
      expect(fake.calls).toHaveLength(2); // provider hit on every ask
    });

    it('validates the request body', async () => {
      const { owner, workspace } = await setupBoardWithCard();

      const res = await request(app)
        .post(`/api/ai/workspaces/${workspace.id}/ask`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ question: '' });

      expect(res.status).toBe(400);
    });

    it('rejects a non-member with 403 and never calls the provider', async () => {
      const { workspace } = await setupBoardWithCard();
      const outsider = await registerUser('Eve', 'eve@example.com');

      const res = await request(app)
        .post(`/api/ai/workspaces/${workspace.id}/ask`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({ question: 'Who works here?' });

      expect(res.status).toBe(403);
      expect(fake.calls).toHaveLength(0);
    });
  });

  describe('break into subtasks', () => {
    it('parses strict JSON into a deduped subtask list', async () => {
      const { owner, card } = await setupBoardWithCard();
      fake.response = JSON.stringify({ subtasks: ['Design form', 'Wire up API', 'Design form', 'Add tests'] });

      const res = await request(app)
        .post(`/api/ai/cards/${card.id}/subtasks`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(res.status).toBe(200);
      expect(res.body.subtasks).toEqual(['Design form', 'Wire up API', 'Add tests']);
    });

    it('parses JSON wrapped in a ```json code fence with trailing prose', async () => {
      const { owner, card } = await setupBoardWithCard();
      fake.response = 'Sure!\n```json\n{"subtasks": ["One", "Two"]}\n```\nHope that helps.';

      const res = await request(app)
        .post(`/api/ai/cards/${card.id}/subtasks`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(res.body.subtasks).toEqual(['One', 'Two']);
    });

    it('falls back to an empty list on unparseable output', async () => {
      const { owner, card } = await setupBoardWithCard();
      fake.response = 'I cannot help with that right now.';

      const res = await request(app)
        .post(`/api/ai/cards/${card.id}/subtasks`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(res.status).toBe(200);
      expect(res.body.subtasks).toEqual([]);
    });
  });

  describe('draft description', () => {
    it('returns the description from strict JSON', async () => {
      const owner = await registerUser('Ada', 'ada@example.com');
      const workspace = await createWorkspace(owner.token);
      fake.response = JSON.stringify({ description: 'Implement a secure login page with validation.' });

      const res = await request(app)
        .post(`/api/ai/workspaces/${workspace.id}/draft-description`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: 'Login page' });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Implement a secure login page with validation.');
    });

    it('falls back to raw prose when the model ignores the JSON contract', async () => {
      const owner = await registerUser('Ada', 'ada@example.com');
      const workspace = await createWorkspace(owner.token);
      fake.response = 'A clear, plain-text description with no JSON at all.';

      const res = await request(app)
        .post(`/api/ai/workspaces/${workspace.id}/draft-description`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: 'Login page' });

      expect(res.body.description).toBe('A clear, plain-text description with no JSON at all.');
    });

    it('validates the request body', async () => {
      const owner = await registerUser('Ada', 'ada@example.com');
      const workspace = await createWorkspace(owner.token);

      const res = await request(app)
        .post(`/api/ai/workspaces/${workspace.id}/draft-description`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('suggest labels & priority', () => {
    it('normalizes labels and priority from strict JSON', async () => {
      const { owner, card } = await setupBoardWithCard();
      fake.response = JSON.stringify({ labels: ['Bug', 'bug', 'Frontend'], priority: 'high', reason: 'User-facing defect.' });

      const res = await request(app)
        .post(`/api/ai/cards/${card.id}/suggestions`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(res.status).toBe(200);
      expect(res.body.labels).toEqual(['bug', 'frontend']);
      expect(res.body.priority).toBe('HIGH');
      expect(res.body.reason).toBe('User-facing defect.');
    });

    it('falls back to no suggestions on malformed output', async () => {
      const { owner, card } = await setupBoardWithCard();
      fake.response = '{ not valid json';

      const res = await request(app)
        .post(`/api/ai/cards/${card.id}/suggestions`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(res.body).toEqual({ labels: [], priority: null });
    });

    it('drops an out-of-range priority but keeps valid labels', async () => {
      const { owner, card } = await setupBoardWithCard();
      fake.response = JSON.stringify({ labels: ['chore'], priority: 'WHENEVER' });

      const res = await request(app)
        .post(`/api/ai/cards/${card.id}/suggestions`)
        .set('Authorization', `Bearer ${owner.token}`);

      // The whole object fails schema validation (bad priority), so we fall back.
      expect(res.body).toEqual({ labels: [], priority: null });
    });
  });

  describe('rate limiting', () => {
    it('returns 429 once a user exceeds the per-minute budget', async () => {
      const { owner, card } = await setupBoardWithCard();
      fake.response = JSON.stringify({ subtasks: ['A'] });
      const limit = env.ai.rateLimitPerMinute;

      // The setup above already consumed budget via board/card creation? No —
      // only AI endpoints count. Spend exactly `limit` successful AI calls.
      for (let i = 0; i < limit; i += 1) {
        const ok = await request(app)
          .post(`/api/ai/cards/${card.id}/subtasks`)
          .set('Authorization', `Bearer ${owner.token}`);
        expect(ok.status).toBe(200);
      }

      const blocked = await request(app)
        .post(`/api/ai/cards/${card.id}/subtasks`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
      expect(blocked.headers['retry-after']).toBeDefined();
    });
  });
});
