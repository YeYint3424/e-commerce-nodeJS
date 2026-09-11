const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.util');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return sendError(res, {
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    statusCode: 422,
    errors,
  });
}

module.exports = { validate };
