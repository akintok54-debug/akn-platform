const express = require('express');
const router = express.Router();
const { getErpOverview } = require('../controllers/erpController');
const { getIdeaSoftStatus, getIdeaSoftAuthUrl, handleIdeaSoftCallback, syncIdeaSoftResource } = require('../controllers/ideasoftController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/ideasoft/callback', handleIdeaSoftCallback);

router.use(verifyToken);

router.get('/overview', getErpOverview);
router.get('/ideasoft/status', getIdeaSoftStatus);
router.get('/ideasoft/auth-url', getIdeaSoftAuthUrl);
router.post('/ideasoft/sync/:resource', syncIdeaSoftResource);

module.exports = router;
