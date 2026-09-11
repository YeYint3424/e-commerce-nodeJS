const categoryService = require('../services/category.service');
const wrapAsync = require('../utils/wrapAsync');
const { sendSuccess } = require('../utils/response.util');

const createCategory = wrapAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return sendSuccess(res, { message: 'Category created', data: { category }, statusCode: 201 });
});

const listCategories = wrapAsync(async (req, res) => {
  const { items, pagination } = await categoryService.listCategories(req.query);
  return sendSuccess(res, { message: 'Categories fetched', data: { categories: items }, pagination });
});

const getCategory = wrapAsync(async (req, res) => {
  const category = await categoryService.getCategory(req.params.id);
  return sendSuccess(res, { message: 'Category fetched', data: { category } });
});

const updateCategory = wrapAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return sendSuccess(res, { message: 'Category updated', data: { category } });
});

const deleteCategory = wrapAsync(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return sendSuccess(res, { message: 'Category deleted', data: null });
});

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
