import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../services/prisma';

const app = createApp();

beforeEach(async () => {
  // Workspace.ownerId is ON DELETE RESTRICT, so child rows must go first
  // in case an earlier test file left workspace fixtures behind.
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token plus the safe user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'Ada@Example.com', password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'dup@example.com', password: 'Password123!' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Two', email: 'dup@example.com', password: 'Password123!' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Grace Hopper', email: 'grace@example.com', password: 'Password123!' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.email).toBe('grace@example.com');
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid token', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Linus Torvalds', email: 'linus@example.com', password: 'Password123!' });
    const { token } = registerRes.body;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('linus@example.com');
    expect(res.body.passwordHash).toBeUndefined();
  });
});
