function sendSuccess(res, { message = 'Success', data = null, pagination = null, statusCode = 200 } = {}) {
  const body = { success: true, message, data };
  if (pagination) {
    body.pagination = pagination;
  }
  return res.status(statusCode).json(body);
}

function sendError(res, { message = 'Something went wrong', code = 'INTERNAL_ERROR', statusCode = 500, errors = null } = {}) {
  const body = { success: false, message, error: { code } };
  if (errors) {
    body.errors = errors;
  }
  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
