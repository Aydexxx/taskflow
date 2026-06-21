import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../services/prisma';
import { UPLOADS_ROOT } from '../services/uploads';

const app = createApp();

// A minimal valid 1x1 transparent PNG, as a base64 data URL.
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function registerUser(email = 'profile@example.com'): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Ada Lovelace', email, password: 'Password123!' });
  return res.body.token as string;
}

beforeEach(async () => {
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  // Remove any avatar files written during the run (the dir is gitignored).
  await rm(UPLOADS_ROOT, { recursive: true, force: true });
});

describe('PATCH /api/users/me', () => {
  it('requires authentication', async () => {
    const res = await request(app).patch('/api/users/me').send({ title: 'Hacker' });
    expect(res.status).toBe(401);
  });

  it('updates title, bio, and social links and returns them', async () => {
    const token = await registerUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Product Designer',
        bio: 'I build calm software.',
        socialLinks: { github: 'https://github.com/ada', website: 'https://ada.dev', twitter: '' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: 'Product Designer',
      bio: 'I build calm software.',
      socialLinks: { github: 'https://github.com/ada', website: 'https://ada.dev' },
    });
    // Blank links are dropped, never persisted as empty strings.
    expect(res.body.socialLinks.twitter).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('persists the profile so a later GET /me returns it', async () => {
    const token = await registerUser();
    await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Engineer', socialLinks: { linkedin: 'https://linkedin.com/in/ada' } });

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.title).toBe('Engineer');
    expect(me.body.socialLinks).toEqual({ linkedin: 'https://linkedin.com/in/ada' });
  });

  it('clears title when set to null', async () => {
    const token = await registerUser();
    await request(app).patch('/api/users/me').set('Authorization', `Bearer ${token}`).send({ title: 'Temp' });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: null });
    expect(res.status).toBe(200);
    expect(res.body.title).toBeNull();
  });

  it('rejects an invalid social link URL', async () => {
    const token = await registerUser();
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ socialLinks: { github: 'not-a-url' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/users/me/avatar', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/users/me/avatar').send({ data: TINY_PNG });
    expect(res.status).toBe(401);
  });

  it('accepts a valid PNG and sets avatarUrl', async () => {
    const token = await registerUser();
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: TINY_PNG });

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toMatch(/^\/uploads\/avatars\/.+\.png$/);
  });

  it('rejects a non-image / unsupported type', async () => {
    const token = await registerUser();
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an image larger than 2 MB', async () => {
    const token = await registerUser();
    // Decoded payload just over 2 MB.
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 16, 0).toString('base64');
    const res = await request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: `data:image/png;base64,${oversized}` });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/2 MB/i);
  });
});
