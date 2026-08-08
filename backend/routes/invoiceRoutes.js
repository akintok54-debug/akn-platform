const express = require("express");
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  sendInvoiceToGIB,
} = require("../controllers/invoiceController");
const { verifyToken } = require("../middleware/authMiddleware"); // Mevcut oturum doğrulama middleware'in

// Tüm fatura rotaları için kimlik doğrulama zorunlu
router.use(verifyToken);

// Rotalar
router.post("/", createInvoice);                // Satıştan veya manuel olarak yeni E-Fatura/E-Arşiv taslağı oluştur
router.get("/", getInvoices);                   // Firmaya ait tüm faturaları listele
router.post("/send/:id", sendInvoiceToGIB);     // Taslak faturayı GİB entegratörüne gönder ve onayla

module.exports = router;