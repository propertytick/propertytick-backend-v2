const express = require('express');
const router = express.Router();
const { deleteUser, softDeleteUser } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const { USER_ROLES } = require('../config/constants');

// Admin-only routes
router.delete('/:id', protect, authorize(USER_ROLES.ADMIN), deleteUser);
router.patch('/:id/soft-delete', protect, authorize(USER_ROLES.ADMIN), softDeleteUser);

module.exports = router;
