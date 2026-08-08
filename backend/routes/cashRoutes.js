const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { createCashTransaction, getCashTransactions } = require("../controllers/cashController");

router.use(verifyToken);

router.post("/transactions", createCashTransaction);
router.get("/transactions", getCashTransactions);

module.exports = router;
