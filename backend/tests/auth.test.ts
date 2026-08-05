import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/config/database';

const app = createApp();

function uniqueEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
}

describe('auth', () => {
  afterAll(async () => {
    // Let fire-and-forget work triggered by the last request (achievement
    // checks, push notifications) settle before the pool closes.
    await new Promise((r) => setTimeout(r, 300));
    await pool.end();
  });

  it('registers a new user and returns tokens', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `user_${Date.now()}`, email, password: 'Password123' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.is_guest).toBe(false);
    expect(res.body.user.avatar_id).toBeGreaterThanOrEqual(1);
  });

  it('rejects registration with an invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `user_${Date.now()}`, email: 'not-an-email', password: 'Password123' });

    expect(res.status).toBe(400);
  });

  it('rejects duplicate email registration', async () => {
    const email = uniqueEmail();
    const payload = { username: `user_${Date.now()}`, email, password: 'Password123' };
    await request(app).post('/api/v1/auth/register').send(payload);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...payload, username: `user_${Date.now()}_2` });

    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const email = uniqueEmail();
    await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `user_${Date.now()}`, email, password: 'Password123' });

    const ok = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeDefined();

    const bad = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword' });
    expect(bad.status).toBe(401);
  });

  it('creates a guest account without credentials', async () => {
    const res = await request(app).post('/api/v1/auth/guest');
    expect(res.status).toBe(201);
    expect(res.body.user.is_guest).toBe(true);
  });

  it('deletes an account and blocks further login', async () => {
    const email = uniqueEmail();
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `user_${Date.now()}`, email, password: 'Password123' });
    const token = reg.body.accessToken;

    const noPassword = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(noPassword.status).toBe(400);

    const wrongPassword = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'WrongPassword' });
    expect(wrongPassword.status).toBe(401);

    const deleted = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Password123' });
    expect(deleted.status).toBe(204);

    const loginAfterDelete = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123' });
    expect(loginAfterDelete.status).toBe(401);
  });
});
