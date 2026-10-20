const express = require('express');
const router = express.Router();

const {
  listColonizers,
  getColonizerById,
  updateMyColonizer,
  generateColonizerCardImage,
} = require('../controllers/colonizerController');

const { protect, optionalAuth } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const { USER_ROLES } = require('../config/constants');

// ---- Public ----
router.get('/', optionalAuth, listColonizers);
router.get('/:id/card', optionalAuth, generateColonizerCardImage);   // 👈 /:id se PEHLE
router.get('/:id', optionalAuth, getColonizerById);                   // 👈 BAAD MEIN

// ---- Protected ----
router.patch('/me', protect, authorize(USER_ROLES.COLONIZER), updateMyColonizer);

module.exports = router;
