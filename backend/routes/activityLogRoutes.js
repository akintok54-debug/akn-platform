const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const { getActivityLogs } = require("../controllers/activityLogController");

router.use(verifyToken, verifyAdmin);
router.get("/", getActivityLogs);

module.exports = router;
