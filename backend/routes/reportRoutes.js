const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getSalesReport,
  getOrdersReport,
  getCustomersReport,
  getReturnsReport,
  getCollectionsReport,
  getStockReport,
  getProductReport,
  getSalesRepReport,
  getAuditReport,
} = require("../controllers/reportController");

router.use(verifyToken);

router.get("/sales", getSalesReport);
router.get("/orders", getOrdersReport);
router.get("/customers", getCustomersReport);
router.get("/returns", getReturnsReport);
router.get("/collections", getCollectionsReport);
router.get("/stock", getStockReport);
router.get("/products", getProductReport);
router.get("/sales-reps", getSalesRepReport);
router.get("/audit", getAuditReport);

module.exports = router;
