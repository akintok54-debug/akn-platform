const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
	getProfiles,
	getUsers,
	createProfile,
	updateProfile,
	assignProfileToUser,
	getRoleOptions,
	createUser,
	updateUserRole,
} = require('../controllers/permissionController');

router.use(verifyToken);
router.get('/', getProfiles);
router.get('/roles', getRoleOptions);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUserRole);
router.post('/', createProfile);
router.put('/:id', updateProfile);
router.post('/assign', assignProfileToUser);

module.exports = router;
