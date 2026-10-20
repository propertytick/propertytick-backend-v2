const express = require('express');
const router = express.Router();

const {
  initiateDeal,
  verifyDealOtp,
  completeDeal,
  getMyDeals,
  getDealById,
  generateSaleAgreement,   // 👈 YEH ADD KARO
} = require('../controllers/dealController');

const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const audit = require('../middlewares/auditLogger');
const { dealLimiter } = require('../middlewares/rateLimiter');
const { initiateDealSchema, verifyDealOtpSchema } = require('../validators/dealValidator');
const { USER_ROLES } = require('../config/constants');

router.use(protect);

router.get('/my', getMyDeals);
router.get('/:id', getDealById);
router.post('/:id/generate-agreement', audit('sale_agreement', 'Deal'), generateSaleAgreement);

router.post(
  '/initiate',
  authorize(USER_ROLES.BROKER),
  dealLimiter,
  validate(initiateDealSchema),
  audit('deal_initiate', 'Deal'),
  initiateDeal
);

router.post(
  '/:id/verify-otp',
  dealLimiter,
  validate(verifyDealOtpSchema),
  audit('deal_verify_otp', 'Deal'),
  verifyDealOtp
);

router.post(
  '/:id/complete',
  authorize(USER_ROLES.BROKER),
  dealLimiter,
  audit('deal_complete', 'Deal'),
  completeDeal
);

module.exports = router;
