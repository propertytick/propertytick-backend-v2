const express = require('express');
const router = express.Router();
const {
  initiateRentDeal,
  verifyRentDealOtp,
  verifyRentDealAadhaar,
  uploadRentDealDocuments,
  updateRentDeal,
  getMyRentDeals,
  getRentDealById,
} = require('../controllers/rentDealController');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const audit = require('../middlewares/auditLogger');
const { dealLimiter } = require('../middlewares/rateLimiter');
const { USER_ROLES } = require('../config/constants');

// Sabhi routes protected hain (login required)
router.use(protect);

// GET Routes
router.get('/my', getMyRentDeals);
router.get('/:id', getRentDealById);

// POST Routes
router.post(
  '/initiate',
  dealLimiter,
  audit('rent_deal_initiate', 'RentDeal'),
  initiateRentDeal
);

router.post(
  '/:id/verify-otp',
  dealLimiter,
  audit('rent_deal_verify_otp', 'RentDeal'),
  verifyRentDealOtp
);

router.post(
  '/:id/verify-aadhaar',
  dealLimiter,
  audit('rent_deal_verify_aadhaar', 'RentDeal'),
  verifyRentDealAadhaar
);

router.post(
  '/:id/upload-documents',
  dealLimiter,
  audit('rent_deal_upload_documents', 'RentDeal'),
  uploadRentDealDocuments
);

// PUT Routes
router.put(
  '/:id/update',
  dealLimiter,
  audit('rent_deal_update', 'RentDeal'),
  updateRentDeal
);

module.exports = router;