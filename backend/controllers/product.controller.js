const productService = require('../services/product.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

function extractImages(req) {
  if (req.files && req.files.length > 0) {
    return req.files.map((f) => `/uploads/products/${f.filename}`);
  }
  if (Array.isArray(req.body.images)) {
    return req.body.images;
  }
  return undefined;
}

const createProduct = wrapAsync(async (req, res) => {
  const data = { ...req.body };
  const images = extractImages(req);
  if (images !== undefined) {
    data.images = images;
  }
  const product = await productService.createProduct(data);
  return sendSuccess(res, { message: 'Product created', data: { product }, statusCode: 201 });
});

const listProducts = wrapAsync(async (req, res) => {
  const { items, pagination } = await productService.listProducts(req.query);
  return sendSuccess(res, { message: 'Products fetched', data: { products: items }, pagination });
});

const getProduct = wrapAsync(async (req, res) => {
  const product = await productService.getProduct(req.params.id);
  return sendSuccess(res, { message: 'Product fetched', data: { product } });
});

const updateProduct = wrapAsync(async (req, res) => {
  const data = { ...req.body };
  const images = extractImages(req);
  if (images !== undefined) {
    data.images = images;
  }
  const product = await productService.updateProduct(req.params.id, data);
  return sendSuccess(res, { message: 'Product updated', data: { product } });
});

const deleteProduct = wrapAsync(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  return sendSuccess(res, { message: 'Product deleted', data: null });
});

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
