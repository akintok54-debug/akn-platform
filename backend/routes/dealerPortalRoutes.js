const express = require("express");
const router = express.Router();
const { verifyToken, verifyDealer } = require("../middleware/authMiddleware");
const {
  dealerLogin,
  getDashboard,
  getStatement,
  getPurchasedProducts,
  getPayments,
  getReturns,
  getOrders,
  getInvoices,
  downloadInvoicePdf,
  downloadStatementPdf,
  createStatementWhatsAppShare,
  createStatementMailShare,
  getNotifications,
  getPortalHistory,
  getProfile,
  changePassword,
  getPublicDashboard,
  getPublicStatement,
  getPublicPurchasedProducts,
  getPublicPayments,
  getPublicReturns,
  getPublicOrders,
  getPublicInvoices,
  downloadPublicInvoicePdf,
  downloadPublicStatementPdf,
  createPublicStatementWhatsAppShare,
  createPublicStatementMailShare,
  getPublicNotifications,
  getPublicPortalHistory,
  getPublicProfile,
} = require("../controllers/dealerPortalController");

router.post("/auth/login", dealerLogin);

router.get("/public/:secureToken/dashboard", getPublicDashboard);
router.get("/public/:secureToken/statement", getPublicStatement);
router.get("/public/:secureToken/statement/pdf", downloadPublicStatementPdf);
router.post("/public/:secureToken/statement/whatsapp", createPublicStatementWhatsAppShare);
router.post("/public/:secureToken/statement/mail", createPublicStatementMailShare);
router.get("/public/:secureToken/purchases", getPublicPurchasedProducts);
router.get("/public/:secureToken/payments", getPublicPayments);
router.get("/public/:secureToken/returns", getPublicReturns);
router.get("/public/:secureToken/orders", getPublicOrders);
router.get("/public/:secureToken/invoices", getPublicInvoices);
router.get("/public/:secureToken/invoices/:id/pdf", downloadPublicInvoicePdf);
router.get("/public/:secureToken/notifications", getPublicNotifications);
router.get("/public/:secureToken/history", getPublicPortalHistory);
router.get("/public/:secureToken/profile", getPublicProfile);

router.use(verifyToken, verifyDealer);
router.get("/dashboard", getDashboard);
router.get("/statement", getStatement);
router.get("/statement/pdf", downloadStatementPdf);
router.post("/statement/whatsapp", createStatementWhatsAppShare);
router.post("/statement/mail", createStatementMailShare);
router.get("/purchases", getPurchasedProducts);
router.get("/payments", getPayments);
router.get("/returns", getReturns);
router.get("/orders", getOrders);
router.get("/invoices", getInvoices);
router.get("/invoices/:id/pdf", downloadInvoicePdf);
router.get("/notifications", getNotifications);
router.get("/history", getPortalHistory);
router.get("/profile", getProfile);
router.put("/profile/password", changePassword);

module.exports = router;
