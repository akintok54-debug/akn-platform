const express = require('express');
const router = express.Router();
const { getErpOverview } = require('../controllers/erpController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/overview', getErpOverview);

module.exports = router;
