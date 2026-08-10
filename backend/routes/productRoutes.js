const express = require("express");
const router = express.Router();
const {
  verifyToken,
  requireModuleAccess,
} = require("../middleware/authMiddleware");

const {
  createProduct,
  uploadProductImage,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsWithFilters,
  getCategories,
  getBrands,
  bulkUpdatePrices,
  bulkUpdateStock,
  bulkUpdateField,
  getProductStats,
} = require("../controllers/productController");

router.use(verifyToken);
router.use(requireModuleAccess("products"));

// Temel CRUD
router.post("/", createProduct);
router.post("/upload-image", uploadProductImage);

// Ürün Merkezi özellikleri
// Bunlar /:id'den ÖNCE olmalı
router.get("/center/filters", getProductsWithFilters);
router.get("/center/categories", getCategories);
router.get("/center/brands", getBrands);
router.get("/center/stats", getProductStats);

// Toplu güncellemeler
router.post("/center/bulk-price", bulkUpdatePrices);
router.post("/center/bulk-stock", bulkUpdateStock);
router.post("/center/bulk-field", bulkUpdateField);

// Genel ürün listesi
router.get("/", getProducts);

// ID'ye göre ürün
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;