const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createBankAccount,
  getBankAccounts,
  createBankTransaction,
  getBankTransactions,
} = require("../controllers/bankController");

router.use(verifyToken);

router.post("/accounts", createBankAccount);
router.get("/accounts", getBankAccounts);
router.post("/transactions", createBankTransaction);
router.get("/transactions", getBankTransactions);

module.exports = router;
