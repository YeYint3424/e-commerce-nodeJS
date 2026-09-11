const categoryRepository = require('../repositories/category.repository');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination.util');

async function createCategory(data) {
  const { name, slug, description, status } = data;
  const category = await categoryRepository.create({ name, slug, description, status });
  return category.toJSON();
}

async function listCategories(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }
  if (query.search) {
    filter.name = new RegExp(query.search, 'i');
  }

  const [items, totalItems] = await Promise.all([
    categoryRepository.paginate(filter, { skip, limit }),
    categoryRepository.countByFilter(filter),
  ]);

  const countMap = await categoryRepository.getProductCounts(items.map((c) => c._id));

  return {
    items: items.map((c) => {
      const obj = c.toJSON();
      obj.productCount = countMap[c._id.toString()] || 0;
      return obj;
    }),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
}

async function getCategory(id) {
  const category = await categoryRepository.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404, 'NOT_FOUND');
  }

  const countMap = await categoryRepository.getProductCounts([category._id]);
  const obj = category.toJSON();
  obj.productCount = countMap[category._id.toString()] || 0;
  return obj;
}

async function updateCategory(id, data) {
  const category = await categoryRepository.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404, 'NOT_FOUND');
  }

  const updates = {};
  ['name', 'slug', 'description', 'status'].forEach((field) => {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  });

  const updated = await categoryRepository.updateById(id, updates);
  return updated.toJSON();
}

async function deleteCategory(id) {
  const category = await categoryRepository.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404, 'NOT_FOUND');
  }

  const activeProductCount = await categoryRepository.countActiveProductsByCategory(id);
  if (activeProductCount > 0) {
    throw new AppError('Cannot delete a category that has active products', 409, 'CONFLICT');
  }

  await categoryRepository.deleteById(id);
}

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
