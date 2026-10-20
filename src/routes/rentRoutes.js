const express = require('express');
const router = express.Router();

const {
  getPointsBalance,
  purchasePoints,
  deductPointOnListing,
  initiateDeal,
  sendDealOtp,
  verifyDealOtp,
  generateAgreement,
  getMyDeals,
  cancelDeal,
  getDealById,
} = require('../controllers/rentController');

const { protect } = require('../middlewares/auth');
const audit = require('../middlewares/auditLogger');

// ---- Rent Points ----
router.get('/points/balance', protect, getPointsBalance);
router.post('/points/purchase', protect, audit('rent_points_purchase', 'RentPoints'), purchasePoints);

// ---- Rent Listing ----
router.post('/list', protect, audit('rent_list', 'Property'), deductPointOnListing);

// ---- Rent Deal ----
router.post('/deal/initiate', protect, audit('rent_deal_initiate', 'RentDeal'), initiateDeal);
router.post('/deal/:id/send-otp', protect, audit('rent_deal_otp_send', 'RentDeal'), sendDealOtp);
router.post('/deal/:id/verify-otp', protect, audit('rent_deal_otp_verify', 'RentDeal'), verifyDealOtp);
router.post('/deal/:id/generate-agreement', protect, audit('rent_agreement', 'RentDeal'), generateAgreement);
router.get('/deal/my', protect, getMyDeals);
router.get('/deal/:id', protect, getDealById);
router.post('/deal/:id/cancel', protect, audit('rent_deal_cancel', 'RentDeal'), cancelDeal);

module.exports = router;
