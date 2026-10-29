const express = require('express');
const router = express.Router();

const {
  listColonizers,
  getColonizerById,
  updateMyColonizer,
  generateColonizerCardImage,
  expressProjectInterest, // 👈 YEH IMPORT ADD KIYA
} = require('../controllers/colonizerController');

const { protect, optionalAuth } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const { USER_ROLES } = require('../config/constants');

// ---- Public Routes ----
router.get('/', optionalAuth, listColonizers);
router.get('/:id/card', optionalAuth, generateColonizerCardImage);
router.post('/:id/interest', expressProjectInterest); // 👈 YEH ROUTE ADD KIYA
router.get('/:id', optionalAuth, getColonizerById);

// ---- Protected Routes ----
router.patch('/me', protect, authorize(USER_ROLES.COLONIZER), updateMyColonizer);

module.exports = router;