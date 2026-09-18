const request = require('supertest');
const createApp = require('../../app');
const User = require('../../models/User');
const { hashPassword } = require('../../utils/password.util');

describe('POST /api/auth/customer/login', () => {
  const app = createApp();

  beforeEach(async () => {
    const hashed = await hashPassword('password123');
    await User.create({
      name: 'Existing Customer',
      email: 'customer@example.com',
      password: hashed,
      role: 'CUSTOMER',
    });
  });

  it('logs in a customer with correct credentials', async () => {
    const res = await request(app).post('/api/auth/customer/login').send({
      email: 'customer@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('customer@example.com');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/customer/login').send({
      email: 'customer@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-existent email with 401', async () => {
    const res = await request(app).post('/api/auth/customer/login').send({
      email: 'nope@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/admin/login', () => {
  const app = createApp();

  beforeEach(async () => {
    const hashed = await hashPassword('adminpass123');
    await User.create({
      name: 'Default Admin',
      email: 'admin@example.com',
      password: hashed,
      role: 'DEFAULT_ADMIN',
    });

    const customerHashed = await hashPassword('password123');
    await User.create({
      name: 'Customer User',
      email: 'customer2@example.com',
      password: customerHashed,
      role: 'CUSTOMER',
    });
  });

  it('logs in an admin-panel user with correct credentials', async () => {
    const res = await request(app).post('/api/auth/admin/login').send({
      email: 'admin@example.com',
      password: 'adminpass123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('DEFAULT_ADMIN');
  });

  it('rejects a customer-only email on the admin-panel login with 401 (no cross-space match)', async () => {
    const res = await request(app).post('/api/auth/admin/login').send({
      email: 'customer2@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a staff-space account with a role outside the admin panel with 403', async () => {
    const hashed = await hashPassword('somepass123');
    await User.create({
      name: 'Weird Role',
      email: 'weird-role@example.com',
      password: hashed,
      role: 'CUSTOMER',
      accountSpace: 'STAFF',
    });

    const res = await request(app).post('/api/auth/admin/login').send({
      email: 'weird-role@example.com',
      password: 'somepass123',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('customer and staff/admin identity spaces', () => {
  const app = createApp();

  it('allows the same email to be used for one customer account and one staff/admin account', async () => {
    const email = 'shared@example.com';

    const registerRes = await request(app).post('/api/auth/customer/register').send({
      name: 'Shared Person (Customer)',
      email,
      password: 'password123',
    });
    expect(registerRes.status).toBe(201);

    const adminHashed = await hashPassword('staffpass123');
    await User.create({
      name: 'Shared Person (Staff)',
      email,
      password: adminHashed,
      role: 'STAFF',
      accountSpace: 'STAFF',
    });

    const customerLogin = await request(app)
      .post('/api/auth/customer/login')
      .send({ email, password: 'password123' });
    expect(customerLogin.status).toBe(200);
    expect(customerLogin.body.data.user.role).toBe('CUSTOMER');

    const staffLogin = await request(app)
      .post('/api/auth/admin/login')
      .send({ email, password: 'staffpass123' });
    expect(staffLogin.status).toBe(200);
    expect(staffLogin.body.data.user.role).toBe('STAFF');

    expect(customerLogin.body.data.user._id).not.toBe(staffLogin.body.data.user._id);
  });
});
