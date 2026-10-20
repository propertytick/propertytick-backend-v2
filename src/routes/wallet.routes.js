const express = require('express');
const router = express.Router();

const { getMyWallet, getMyTransactions, getAvailablePacks } = require('../controllers/walletController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const { USER_ROLES } = require('../config/constants');

router.use(protect);

// 👇 COLONIZER ADD KIYA
router.get(
  '/me',
  authorize(USER_ROLES.BROKER, USER_ROLES.ADVOCATE, USER_ROLES.COLONIZER),
  getMyWallet
);

router.get(
  '/transactions',
  authorize(USER_ROLES.BROKER, USER_ROLES.ADVOCATE, USER_ROLES.COLONIZER),
  getMyTransactions
);

router.get(
  '/packs',
  authorize(USER_ROLES.BROKER, USER_ROLES.ADVOCATE, USER_ROLES.COLONIZER),
  getAvailablePacks
);

module.exports = router;
