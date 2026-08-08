const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createAccount,
  getAccounts,
  createTransaction,
  deleteAccount,
  getAccountTransactions,
  getRecentTransactions,
  getCustomerStatement,
  getCashReport,
} = require("../controllers/accountController");

router.use(verifyToken);

// Hesapları listele ve yeni hesap oluştur
router.route("/").get(getAccounts).post(createAccount);

// Para giriş/çıkış işlemi yap
router.route("/transaction").post(createTransaction);

// Son işlemler
router.get("/transactions", getRecentTransactions);
router.get("/cash-report", getCashReport);
router.get("/customer-statement/:customerId", getCustomerStatement);

// Belirli bir hesabın işlem geçmişini getir ve güvenli sil
router.route("/:id").get(getAccountTransactions).delete(deleteAccount);

module.exports = router;