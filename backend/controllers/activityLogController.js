const ActivityLog = require("../models/ActivityLog");
const { parseListQuery } = require("../utils/queryFeatures");

const getActivityLogs = async (req, res) => {
  try {
    const companyId = req.user?.company || req.user?.companyId;
    const { module, action, userId } = req.query;
    const list = parseListQuery(req.query);

    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (module) filter.module = String(module).trim();
    if (action) filter.action = String(action).trim();
    if (userId) filter.userId = userId;

    const [items, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("userId", "name email role")
        .sort(list.sort)
        .skip(list.skip)
        .limit(list.limit),
      ActivityLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      items,
      pagination: {
        page: list.page,
        limit: list.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / list.limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getActivityLogs };
