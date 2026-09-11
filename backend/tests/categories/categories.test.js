const request = require('supertest');
const createApp = require('../../app');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const { createUserAndToken } = require('../helpers/testUtils');

describe('Categories module', () => {
  const app = createApp();

  describe('GET /api/categories', () => {
    it('is public and does not require a token', async () => {
      await Category.create({ name: 'Electronics' });

      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.data.categories.length).toBe(1);
      expect(res.body.data.categories[0]).toHaveProperty('productCount', 0);
    });

    it('paginates results', async () => {
      for (let i = 0; i < 15; i += 1) {
        await Category.create({ name: `Category ${i}` });
      }

      const res = await request(app).get('/api/categories?page=2&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.totalItems).toBe(15);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('supports search and status filters', async () => {
      await Category.create({ name: 'Books', status: 'ACTIVE' });
      await Category.create({ name: 'Games', status: 'INACTIVE' });

      const res = await request(app).get('/api/categories?search=Book');
      expect(res.status).toBe(200);
      expect(res.body.data.categories.length).toBe(1);
      expect(res.body.data.categories[0].name).toBe('Books');

      const res2 = await request(app).get('/api/categories?status=INACTIVE');
      expect(res2.status).toBe(200);
      expect(res2.body.data.categories.length).toBe(1);
      expect(res2.body.data.categories[0].name).toBe('Games');
    });

    it('reports an accurate productCount', async () => {
      const category = await Category.create({ name: 'Toys' });
      await Product.create({ name: 'Toy Car', category: category._id, price: 10 });
      await Product.create({ name: 'Toy Boat', category: category._id, price: 12 });

      const res = await request(app).get(`/api/categories/${category._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.category.productCount).toBe(2);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('is public and returns 404 for a missing category', async () => {
      const res = await request(app).get('/api/categories/64b64b64b64b64b64b64b64b');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/categories', () => {
    it('rejects requests without a token with 401', async () => {
      const res = await request(app).post('/api/categories').send({ name: 'Clothing' });
      expect(res.status).toBe(401);
    });

    it('rejects a non-admin role with 403', async () => {
      const { token } = await createUserAndToken({ role: 'STAFF' });

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Clothing' });

      expect(res.status).toBe(403);
    });

    it('rejects invalid payload with 422', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });

      expect(res.status).toBe(422);
    });

    it('creates a category and auto-generates a slug', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Home Appliances' });

      expect(res.status).toBe(201);
      expect(res.body.data.category.slug).toBe('home-appliances');
    });

    it('rejects duplicate category names with 409', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sports' });

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sports' });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('updates a category', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await Category.create({ name: 'Kitchen' });

      const res = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Kitchen essentials' });

      expect(res.status).toBe(200);
      expect(res.body.data.category.description).toBe('Kitchen essentials');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('deletes a category with no active products', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await Category.create({ name: 'Garden' });

      const res = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const found = await Category.findById(category._id);
      expect(found).toBeNull();
    });

    it('rejects deleting a category referenced by an active product with 409', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await Category.create({ name: 'Furniture' });
      await Product.create({ name: 'Chair', category: category._id, price: 50, status: 'ACTIVE' });

      const res = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);

      const found = await Category.findById(category._id);
      expect(found).not.toBeNull();
    });

    it('allows deleting a category whose only products are INACTIVE', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await Category.create({ name: 'Outdoor' });
      await Product.create({ name: 'Tent', category: category._id, price: 80, status: 'INACTIVE' });

      const res = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
