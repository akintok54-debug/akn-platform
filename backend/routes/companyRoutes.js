const express = require("express");
const router = express.Router();

const {
  createCompany,
  getCompanies,
  getMyCompany,
  updateMyCompany,
  getBackup,
} = require("../controllers/companyController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.post("/", verifyToken, verifyAdmin, createCompany);
router.get("/", verifyToken, verifyAdmin, getCompanies);
router.get("/me", verifyToken, getMyCompany);
router.put("/me", verifyToken, updateMyCompany);
router.get("/backup", verifyToken, getBackup);

module.exports = router;