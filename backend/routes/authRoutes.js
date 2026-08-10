const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
  register,
  inviteRegister,
  login,
  logout,
  getSuperAdminCandidates,
  getSuperAdminContact,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/invite-register", inviteRegister);
router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.get("/super-admin/candidates", getSuperAdminCandidates);
router.get("/super-admin/contact", getSuperAdminContact);

module.exports = router;