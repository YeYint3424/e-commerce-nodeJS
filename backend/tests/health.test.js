const request = require('supertest');
const createApp = require('../app');

describe('GET /api/health', () => {
  it('returns a healthy status', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('uptime');
  });
});
