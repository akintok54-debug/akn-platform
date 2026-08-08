const { writeActivityLog } = require("../services/activityLogService");

const activityLogMiddleware = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", async () => {
    if (req.method === "GET") return;
    if (res.statusCode >= 400) return;
    if (!req.user?.id) return;

    try {
      const moduleName = String(req.baseUrl || "api").replace("/api/", "") || "api";
      await writeActivityLog({
        companyId: req.user.company || req.user.companyId,
        userId: req.user.id,
        module: moduleName,
        action: req.method,
        entityType: moduleName,
        entityId: null,
        meta: {
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        },
        ipAddress: req.ip,
      });
    } catch (error) {
      console.error("Activity log yazma hatasi:", error.message);
    }
  });

  next();
};

module.exports = activityLogMiddleware;
