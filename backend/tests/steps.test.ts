import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/config/database';

const app = createApp();

async function registerAndLogin(): Promise<string> {
  const email = `steps_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ username: `steps_${Date.now()}`, email, password: 'Password123' });
  return res.body.accessToken;
}

describe('steps', () => {
  afterAll(async () => {
    // Let fire-and-forget work triggered by the last request (achievement
    // checks, push notifications) settle before the pool closes.
    await new Promise((r) => setTimeout(r, 300));
    await pool.end();
  });

  it('rejects step sync without auth', async () => {
    const res = await request(app)
      .post('/api/v1/steps/sync')
      .send({ step_date: '2026-01-01', step_count: 1000 });
    expect(res.status).toBe(401);
  });

  it('rejects invalid step payloads', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post('/api/v1/steps/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ step_date: 'not-a-date', step_count: -5 });
    expect(res.status).toBe(400);
  });

  it('syncs steps and reflects the value in today totals', async () => {
    const token = await registerAndLogin();
    const today = new Date().toISOString().split('T')[0];

    const sync = await request(app)
      .post('/api/v1/steps/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ step_date: today, step_count: 4200 });
    expect(sync.status).toBe(200);
    expect(sync.body.step_count).toBe(4200);

    const todayRes = await request(app)
      .get('/api/v1/steps/me/today')
      .set('Authorization', `Bearer ${token}`);
    expect(todayRes.status).toBe(200);
    expect(todayRes.body.step_count).toBe(4200);
  });

  it('does not let a lower re-sync overwrite a higher step count for the day', async () => {
    const token = await registerAndLogin();
    const today = new Date().toISOString().split('T')[0];

    await request(app)
      .post('/api/v1/steps/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ step_date: today, step_count: 5000 });

    const lower = await request(app)
      .post('/api/v1/steps/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ step_date: today, step_count: 3000 });
    expect(lower.status).toBe(200);
    expect(lower.body.step_count).toBe(5000);
  });
});
