const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const { downloadTemplate, validateImport, commitImport, analyzeImport, getImportJobs } = require("../controllers/importController");

router.use(verifyToken, verifyAdmin);

router.get("/templates/:module", downloadTemplate);
router.post("/:module/analyze", analyzeImport);
router.post("/:module/validate", validateImport);
router.post("/:module/commit", commitImport);
router.get("/jobs", getImportJobs);

module.exports = router;
