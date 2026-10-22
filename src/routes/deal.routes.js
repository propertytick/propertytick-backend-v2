const express = require('express');
const router = express.Router();
const {
  initiateDeal,
  verifyDealOtp,
  verifyAadhaar,
  uploadDealDocuments,
  updateDealRegistry,
  getMyDeals,
  getDealById,
} = require('../controllers/dealController');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleCheck');
const audit = require('../middlewares/auditLogger');
const { dealLimiter } = require('../middlewares/rateLimiter');
const { USER_ROLES } = require('../config/constants');

// Sabhi routes protected hain (login required)
router.use(protect);

// GET Routes
router.get('/my', getMyDeals);                    // Apni saari deals dekho
router.get('/:id', getDealById);                  // Specific deal details

// POST Routes
router.post(
  '/initiate',
  authorize(USER_ROLES.BROKER),
  dealLimiter,
  audit('deal_initiate', 'Deal'),
  initiateDeal
);

router.post(
  '/:id/verify-otp',
  dealLimiter,
  audit('deal_verify_otp', 'Deal'),
  verifyDealOtp
);

router.post(
  '/:id/verify-aadhaar',
  dealLimiter,
  audit('deal_verify_aadhaar', 'Deal'),
  verifyAadhaar
);

router.post(
  '/:id/upload-documents',
  authorize(USER_ROLES.BROKER),
  dealLimiter,
  audit('deal_upload_documents', 'Deal'),
  uploadDealDocuments
);

// PUT Routes
router.put(
  '/:id/update-registry',
  authorize(USER_ROLES.BROKER),
  dealLimiter,
  audit('deal_update_registry', 'Deal'),
  updateDealRegistry
);

module.exports = router;