const express = require("express");
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  recordPayment,
  cancelInvoice,
  sendInvoiceToGIB,
  getAccountingReport,
} = require("../controllers/invoiceController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Tüm rotaları koru
router.use(verifyToken);

// FATURA İŞLEMLERİ
router.post("/", createInvoice); // Fatura oluştur
router.get("/", getInvoices); // Tüm faturaları listele (filtre destekli)
router.get("/:id", getInvoiceById); // Fatura detay & ödemeler
router.post("/:id/cancel", cancelInvoice); // Fatura iptal et
router.post("/:invoiceId/payment", recordPayment); // Ödeme kaydet

// GİB ENTEGRASYONU
router.post("/:id/send-to-gib", sendInvoiceToGIB); // GİB'e gönder

// RAPORLAR
router.get("/reports/accounting", getAccountingReport); // Muhasebe raporu

module.exports = router;