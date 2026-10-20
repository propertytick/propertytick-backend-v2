const express = require('express');
const router = express.Router();
const {
  getMyReferralCode,
  getMyReferralStats,
} = require('../controllers/referralController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/my-code', getMyReferralCode);
router.get('/my-stats', getMyReferralStats);

module.exports = router;
