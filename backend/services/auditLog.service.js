const auditLogRepository = require('../repositories/auditLog.repository');

async function record({ user, action, entity, entityId, reason, oldValue, newValue }) {
  return auditLogRepository.create({ user, action, entity, entityId, reason, oldValue, newValue });
}

module.exports = {
  record,
};
