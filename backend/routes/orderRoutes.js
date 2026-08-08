const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  searchOrderProducts,
  createOrder,
  getOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

router.use(verifyToken);

router.get("/products", searchOrderProducts);
router.get("/", getOrders);
router.post("/", createOrder);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
