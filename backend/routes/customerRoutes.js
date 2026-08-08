const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  addTransaction,
  getCustomerLedger,
  getCustomerStatementPdf,
  createCustomerWhatsAppShare,
  createCustomerMailShare,
  sendDebtReminder,
  getCustomerShareHistory,
  getCustomerPortalLink,
  refreshCustomerPortalLink,
  deactivateCustomerPortalLink,
  bulkUpdateCustomerPortalLinks,
} = require("../controllers/customerController");

router.use(verifyToken);

router.post("/", createCustomer);
router.get("/", getCustomers);
router.get("/:id", getCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.get("/:id/ledger", getCustomerLedger);
router.post("/portal/bulk", bulkUpdateCustomerPortalLinks);
router.get("/:id/portal/link", getCustomerPortalLink);
router.post("/:id/portal/link/refresh", refreshCustomerPortalLink);
router.post("/:id/portal/deactivate", deactivateCustomerPortalLink);
router.get("/:id/statement/pdf", getCustomerStatementPdf);
router.post("/:id/share/whatsapp", createCustomerWhatsAppShare);
router.post("/:id/share/mail", createCustomerMailShare);
router.post("/:id/reminder", sendDebtReminder);
router.post("/:id/reminder/debt", sendDebtReminder);
router.get("/:id/share/history", getCustomerShareHistory);

// Fatura, Sipariş, İade ve Tahsilatların kaydedildiği rota
router.post("/:id/transactions", addTransaction);

module.exports = router;