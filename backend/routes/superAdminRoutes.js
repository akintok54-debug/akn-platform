const express = require("express");
const router = express.Router();
const { verifyToken, verifySuperAdmin } = require("../middleware/authMiddleware");
const {
  getOverview,
  listCompanies,
  listUsers,
  updateUserAccess,
  updateUserStatus,
  updateCompanySubscription,
  approveSuperAdmin,
  assignKnownSuperAdminByEmail,
  createSuperAdminNotice,
} = require("../controllers/superAdminController");

router.use(verifyToken, verifySuperAdmin);
router.get("/overview", getOverview);
router.get("/companies", listCompanies);
router.get("/users", listUsers);
router.patch("/users/:id/access", updateUserAccess);
router.patch("/users/:id/status", updateUserStatus);
router.patch("/companies/:id/subscription", updateCompanySubscription);
router.post("/approve-super-admin", approveSuperAdmin);
router.post("/assign-known-super-admin", assignKnownSuperAdminByEmail);
router.post("/notices", createSuperAdminNotice);

module.exports = router;