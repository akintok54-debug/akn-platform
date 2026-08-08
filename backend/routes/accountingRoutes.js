const express = require("express");
const router = express.Router();
const {
  receivePayment,
  getCustomerStatement,
  getCashReport,
} = require("../controllers/accountingController");

// Oturum ve yetki kontrolü middleware'ini dahil ediyoruz
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Artık bu dosyadaki tüm işlemler sadece giriş yapmış VE yönetici yetkisine sahip kullanıcılara açık
router.use(verifyToken, verifyAdmin);

// Rotalar
router.post("/receive-payment", receivePayment);    // Müşteriden tahsilat al, cariyi ve kasayı güncelle
router.get("/statement/:customerId", getCustomerStatement); // Müşterinin cari ekstresini ve borç/alacak geçmişini getir
router.get("/cash-report", getCashReport);          // Kasa raporunu ve anlık bakiye durumunu getir

module.exports = router;