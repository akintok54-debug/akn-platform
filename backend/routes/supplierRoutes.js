const express = require("express");
const router = express.Router();

const {
  verifyToken,
  requireModuleAccess,
} = require("../middleware/authMiddleware");

const {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const {
  createPurchaseInvoice,
} = require("../controllers/purchaseInvoiceController");

// ======================================================
// AUTH
// ======================================================
router.use(verifyToken);
router.use(requireModuleAccess("suppliers"));

// ======================================================
// TEDARİKÇİLER
// ======================================================

// Tüm tedarikçileri listele
router.get("/", getSuppliers);

// Yeni tedarikçi oluştur
router.post("/", createSupplier);

// ======================================================
// ALIŞ FATURASI
// ======================================================

// Tedarikçiye alış faturası oluştur
// Fatura + stok girişi + cari borç tek işlemde
router.post("/purchase-invoice", createPurchaseInvoice);

// ======================================================
// TEK TEDARİKÇİ
// ======================================================

// Tek tedarikçi getir
router.get("/:id", getSupplier);

// Tedarikçi güncelle
router.put("/:id", updateSupplier);

// Tedarikçi sil
router.delete("/:id", deleteSupplier);

module.exports = router;