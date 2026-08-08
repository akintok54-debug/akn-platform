const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getStockOverview,
  createWarehouse,
  getWarehouses,
  createStockMovement,
  getStockMovements,
} = require("../controllers/stockController");

router.use(verifyToken);

router.get("/overview", getStockOverview);
router.get("/warehouses", getWarehouses);
router.post("/warehouses", createWarehouse);
router.get("/movements", getStockMovements);
router.post("/movements", createStockMovement);

module.exports = router;
