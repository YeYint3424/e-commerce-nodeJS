const request = require('supertest');
const createApp = require('../../app');
const Product = require('../../models/Product');
const { createUserAndToken, createCategory, createPaymentOption, tinyPngBuffer } = require('../helpers/testUtils');

describe('Products module', () => {
  const app = createApp();

  describe('GET /api/products', () => {
    it('is public and does not require a token', async () => {
      const category = await createCategory();
      await Product.create({ name: 'Widget', category: category._id, price: 20 });

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].category.name).toBe(category.name);
    });

    it('paginates results', async () => {
      const category = await createCategory();
      for (let i = 0; i < 15; i += 1) {
        await Product.create({ name: `Product ${i}`, category: category._id, price: 10 + i });
      }

      const res = await request(app).get('/api/products?page=2&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.totalItems).toBe(15);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('supports search, category filter, price range, and sorting', async () => {
      const categoryA = await createCategory({ name: 'Category A' });
      const categoryB = await createCategory({ name: 'Category B' });
      await Product.create({ name: 'Cheap Shirt', category: categoryA._id, price: 10 });
      await Product.create({ name: 'Expensive Shirt', category: categoryA._id, price: 100 });
      await Product.create({ name: 'Random Toy', category: categoryB._id, price: 50 });

      const searchRes = await request(app).get('/api/products?search=Shirt');
      expect(searchRes.body.data.products.length).toBe(2);

      const categoryRes = await request(app).get(`/api/products?category=${categoryB._id}`);
      expect(categoryRes.body.data.products.length).toBe(1);
      expect(categoryRes.body.data.products[0].name).toBe('Random Toy');

      const priceRes = await request(app).get('/api/products?minPrice=40&maxPrice=60');
      expect(priceRes.body.data.products.length).toBe(1);
      expect(priceRes.body.data.products[0].name).toBe('Random Toy');

      const sortedAsc = await request(app).get('/api/products?sort=price_asc');
      expect(sortedAsc.body.data.products[0].price).toBe(10);

      const sortedDesc = await request(app).get('/api/products?sort=price_desc');
      expect(sortedDesc.body.data.products[0].price).toBe(100);
    });
  });

  describe('GET /api/products/:id', () => {
    it('returns 404 for a missing product', async () => {
      const res = await request(app).get('/api/products/64b64b64b64b64b64b64b64b');
      expect(res.status).toBe(404);
    });

    it('populates category and paymentOptions', async () => {
      const category = await createCategory();
      const paymentOption = await createPaymentOption();
      const product = await Product.create({
        name: 'Gadget',
        category: category._id,
        price: 30,
        paymentOptions: [paymentOption._id],
      });

      const res = await request(app).get(`/api/products/${product._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product.category.name).toBe(category.name);
      expect(res.body.data.product.paymentOptions[0].name).toBe(paymentOption.name);
    });
  });

  describe('POST /api/products', () => {
    it('rejects requests without a token with 401', async () => {
      const category = await createCategory();
      const res = await request(app).post('/api/products').send({ name: 'No Auth', category: category._id, price: 10 });
      expect(res.status).toBe(401);
    });

    it('rejects a CUSTOMER role with 403', async () => {
      const { token } = await createUserAndToken({ role: 'CUSTOMER' });
      const category = await createCategory();

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Blocked', category: category._id, price: 10 });

      expect(res.status).toBe(403);
    });

    it('allows a STAFF role to create a product', async () => {
      const { token } = await createUserAndToken({ role: 'STAFF' });
      const category = await createCategory();

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Staff Created', category: category._id.toString(), price: 25 });

      expect(res.status).toBe(201);
      expect(res.body.data.product.name).toBe('Staff Created');
    });

    it('rejects invalid payload with 422', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '', category: 'not-a-valid-id', price: -5 });

      expect(res.status).toBe(422);
    });

    it('rejects a well-formed but non-existent category id with 404', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Orphan Product', category: '64b64b64b64b64b64b64b64b', price: 10 });

      expect(res.status).toBe(404);
    });

    it('rejects a discountPrice that is not less than price', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await createCategory();

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad Discount', category: category._id.toString(), price: 10, discountPrice: 15 });

      expect(res.status).toBe(422);
    });

    it('creates a product with plain JSON images array', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await createCategory();

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'JSON Images Product',
          category: category._id.toString(),
          price: 40,
          images: ['/uploads/products/example.png'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.images).toEqual(['/uploads/products/example.png']);
    });

    it('creates a product with uploaded image files', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await createCategory();

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'Uploaded Image Product')
        .field('category', category._id.toString())
        .field('price', '55')
        .attach('images', tinyPngBuffer(), 'product.png');

      expect(res.status).toBe(201);
      expect(res.body.data.product.images.length).toBe(1);
      expect(res.body.data.product.images[0]).toMatch(/^\/uploads\/products\//);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('updates a product', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await createCategory();
      const product = await Product.create({ name: 'Old Name', category: category._id, price: 20 });

      const res = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', price: 25 });

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('New Name');
      expect(res.body.data.product.price).toBe(25);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('rejects a STAFF role with 403', async () => {
      const { token } = await createUserAndToken({ role: 'STAFF' });
      const category = await createCategory();
      const product = await Product.create({ name: 'Cannot Delete', category: category._id, price: 20 });

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('allows an ADMIN role to delete a product', async () => {
      const { token } = await createUserAndToken({ role: 'ADMIN' });
      const category = await createCategory();
      const product = await Product.create({ name: 'Can Delete', category: category._id, price: 20 });

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const found = await Product.findById(product._id);
      expect(found).toBeNull();
    });
  });
});
