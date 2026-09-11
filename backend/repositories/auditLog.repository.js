const AuditLog = require('../models/AuditLog');

async function create(data) {
  return AuditLog.create(data);
}

module.exports = {
  create,
};
