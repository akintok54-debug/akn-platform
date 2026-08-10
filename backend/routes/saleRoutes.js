const express = require("express");
const router = express.Router();
const {
  createSale,
  getSales,
} = require("../controllers/saleController");
const { verifyToken, requireModuleAccess } = require("../middleware/authMiddleware"); // Mevcut oturum doğrulama middleware'in

// Tüm satış rotaları için kimlik doğrulama zorunlu
router.use(verifyToken);
router.use(requireModuleAccess("sales"));

// Rotalar
router.post("/", createSale);       // Yeni sepet oluştur, satışı bitir, stoktan düş ve cariye işle
router.get("/", getSales);          // Yapılan satışları listele (Dükkana veya firmaya göre filtrelenebilir)

module.exports = router;