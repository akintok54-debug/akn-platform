const ActivityLog = require("../models/ActivityLog");

const writeActivityLog = async ({
  companyId,
  userId,
  module,
  action,
  entityType,
  entityId,
  before,
  after,
  meta,
  ipAddress,
  session,
}) => {
  if (!action || !module) {
    return null;
  }

  const payload = {
    companyId,
    userId,
    module,
    action,
    entityType: entityType || "",
    entityId: entityId || null,
    before: before || null,
    after: after || null,
    meta: meta || null,
    ipAddress: ipAddress || "",
  };

  const result = await ActivityLog.create([payload], session ? { session } : undefined);
  return result[0];
};

module.exports = { writeActivityLog };
