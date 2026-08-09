const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
  createProduct,
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

// Temel CRUD
router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// Ürün Merkezi özellikleri
router.get("/center/filters", getProductsWithFilters); // filtreleme, arama, sıralama
router.get("/center/categories", getCategories); // mevcut kategoriler
router.get("/center/brands", getBrands); // mevcut markalar
router.get("/center/stats", getProductStats); // istatistikler

// Toplu güncellemeler
router.post("/center/bulk-price", bulkUpdatePrices); // toplu fiyat güncelle
router.post("/center/bulk-stock", bulkUpdateStock); // toplu stok güncelle
router.post("/center/bulk-field", bulkUpdateField); // toplu alan güncelle (kategori, marka, vb)

module.exports = router;