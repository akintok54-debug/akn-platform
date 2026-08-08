const express = require("express");
const router = express.Router();
const {
  addStoreProduct,
  getStoreProducts,
  updateStoreProduct,
  deleteStoreProduct,
} = require("../controllers/storeProductController");
const { verifyToken } = require("../middleware/authMiddleware"); // Varsa mevcut kimlik doğrulama middleware'in

// Tüm işlemler için oturum / token doğrulaması zorunlu olsun
router.use(verifyToken);

// Rotalar
router.post("/", addStoreProduct);                  // Dükkana yeni ürün/stok ekle
router.get("/:storeId", getStoreProducts);          // Belirli dükkanın ürünlerini listele
router.put("/:id", updateStoreProduct);             // Dükkan ürün fiyatını/stokunu güncelle
router.delete("/:id", deleteStoreProduct);          // Ürünü dükkandan sil

module.exports = router;