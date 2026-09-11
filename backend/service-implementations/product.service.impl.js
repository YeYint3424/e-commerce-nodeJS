const productRepository = require('../repositories/product.repository');
const categoryRepository = require('../repositories/category.repository');
const paymentOptionRepository = require('../repositories/paymentOption.repository');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination.util');

const SORT_MAP = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
};

async function assertCategoryExists(categoryId) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw new AppError('Category not found', 404, 'NOT_FOUND');
  }
}

async function assertPaymentOptionsExist(paymentOptionIds) {
  if (!paymentOptionIds || paymentOptionIds.length === 0) {
    return;
  }
  const allExist = await paymentOptionRepository.existsAllByIds(paymentOptionIds);
  if (!allExist) {
    throw new AppError('One or more payment options were not found', 404, 'NOT_FOUND');
  }
}

function assertDiscountPrice(price, discountPrice) {
  if (discountPrice === undefined || discountPrice === null) {
    return;
  }
  if (Number(discountPrice) >= Number(price)) {
    throw new AppError('discountPrice must be less than price', 422, 'VALIDATION_ERROR');
  }
}

async function createProduct(data) {
  const { name, description, category, price, discountPrice, stock, sku, images, status, paymentOptions } = data;

  await assertCategoryExists(category);
  await assertPaymentOptionsExist(paymentOptions);
  assertDiscountPrice(price, discountPrice);

  const product = await productRepository.create({
    name,
    description,
    category,
    price,
    discountPrice,
    stock,
    sku,
    images,
    status,
    paymentOptions,
  });

  return productRepository.findById(product._id);
}

async function listProducts(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.search) {
    filter.name = new RegExp(query.search, 'i');
  }
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) {
      filter.price.$gte = Number(query.minPrice);
    }
    if (query.maxPrice) {
      filter.price.$lte = Number(query.maxPrice);
    }
  }

  const sort = SORT_MAP[query.sort] || SORT_MAP.newest;

  const [items, totalItems] = await Promise.all([
    productRepository.paginate(filter, { skip, limit, sort }),
    productRepository.countByFilter(filter),
  ]);

  return { items, pagination: buildPaginationMeta({ page, limit, totalItems }) };
}

async function getProduct(id) {
  const product = await productRepository.findById(id);
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }
  return product;
}

async function updateProduct(id, data) {
  const existing = await productRepository.findById(id);
  if (!existing) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }

  if (data.category !== undefined) {
    await assertCategoryExists(data.category);
  }
  if (data.paymentOptions !== undefined) {
    await assertPaymentOptionsExist(data.paymentOptions);
  }

  const targetPrice = data.price !== undefined ? data.price : existing.price;
  const targetDiscountPrice = data.discountPrice !== undefined ? data.discountPrice : existing.discountPrice;
  assertDiscountPrice(targetPrice, targetDiscountPrice);

  const updates = {};
  ['name', 'description', 'category', 'price', 'discountPrice', 'stock', 'sku', 'images', 'status', 'paymentOptions'].forEach(
    (field) => {
      if (data[field] !== undefined) {
        updates[field] = data[field];
      }
    }
  );

  return productRepository.updateById(id, updates);
}

async function deleteProduct(id) {
  const existing = await productRepository.findById(id);
  if (!existing) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }
  await productRepository.deleteById(id);
}

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
