const Deal = require('../models/Deal');
const Property = require('../models/Property');
const User = require('../models/User');
const Broker = require('../models/Broker');
const Milestone = require('../models/Milestone');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { createAndSendOtp, verifyOtp } = require('../services/otpService');
const { consumePoint } = require('../services/walletService');
const { recalculateUserRank } = require('../services/rankingService');
const { DEAL_STATUS, PROPERTY_STATUS, HTTP_STATUS } = require('../config/constants');
const crypto = require('crypto');

/**
 * POST /api/v1/deals/initiate
 * Broker initiates a deal
 */
const initiateDeal = async (req, res, next) => {
  try {
    const { propertyId, buyerPhone, finalAmount, tokenAmount, commissionPercent, sellerWitness, buyerWitness } = req.body;

    const property = await Property.findById(propertyId);
    if (!property || property.status !== PROPERTY_STATUS.ACTIVE) {
      return ApiResponse.error(res, 'Property not available', HTTP_STATUS.BAD_REQUEST);
    }

    const buyer = await User.findOne({ phone: buyerPhone });
    if (!buyer) {
      return ApiResponse.error(res, 'Buyer not registered. Please ask buyer to register first.', HTTP_STATUS.NOT_FOUND);
    }

    const seller = property.owner;

    const deal = await Deal.create({
  property: property._id,
  buyer: buyer._id,
  seller,
  broker: req.user._id,
  finalAmount,
  tokenAmount,
  commissionPercent,
  sellerWitness: sellerWitness || null,   // 👈 YEH ADD KARO
  buyerWitness: buyerWitness || null,     // 👈 YEH ADD KARO
  status: DEAL_STATUS.INITIATED,
});

    // Send OTP to buyer
    await createAndSendOtp(buyerPhone, 'deal_close', { dealId: deal._id.toString(), role: 'buyer' });

    return ApiResponse.success(
      res,
      { deal },
      'Deal initiated. OTP sent to buyer.',
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/deals/:id/verify-otp
 * Verify buyer or owner OTP
 */
const verifyDealOtp = async (req, res, next) => {
  try {
    const { otp, party } = req.body; // party: 'buyer' or 'owner'
    const deal = await Deal.findById(req.params.id);

    if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);

    // Authorization check
    if (party === 'buyer' && String(req.user._id) !== String(deal.buyer)) {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }
    if (party === 'owner' && String(req.user._id) !== String(deal.seller)) {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    const phone = party === 'buyer'
      ? (await User.findById(deal.buyer).select('phone')).phone
      : (await User.findById(deal.seller).select('phone')).phone;

    await verifyOtp(phone, otp, 'deal_close');

    if (party === 'buyer') {
      deal.buyerOtp.isVerified = true;
      deal.buyerOtp.verifiedAt = new Date();
      deal.status = DEAL_STATUS.BUYER_OTP_VERIFIED;
    } else {
      deal.ownerOtp.isVerified = true;
      deal.ownerOtp.verifiedAt = new Date();
      if (deal.status === DEAL_STATUS.BUYER_OTP_VERIFIED) {
        deal.status = DEAL_STATUS.OWNER_OTP_VERIFIED;
      }
    }

    await deal.save();

    return ApiResponse.success(res, { deal }, `${party} OTP verified`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/deals/:id/complete
 * Both OTP verified — complete deal + deduct broker point
 */
const completeDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);

    // Only broker can complete
    if (String(req.user._id) !== String(deal.broker)) {
      return ApiResponse.error(res, 'Only broker can complete the deal', HTTP_STATUS.FORBIDDEN);
    }

    if (!deal.buyerOtp.isVerified || !deal.ownerOtp.isVerified) {
      return ApiResponse.error(res, 'Both buyer and owner OTP must be verified first', HTTP_STATUS.BAD_REQUEST);
    }

    // Deduct point from broker wallet (free first, then paid)
    let deductionResult;
    try {
      deductionResult = await consumePoint(
        deal.broker,
        'deal',
        deal._id,
        `Deal closed for property ${deal.property}`
      );
      deal.pointDeducted = true;
      deal.pointDeductedAt = new Date();
    } catch (err) {
      return ApiResponse.error(res, err.message, HTTP_STATUS.BAD_REQUEST);
    }

    // Mark property sold
    await Property.updateOne(
      { _id: deal.property },
      { status: PROPERTY_STATUS.SOLD, soldTo: deal.buyer, soldAt: new Date() }
    );

    // Update milestones
    await Milestone.findOneAndUpdate(
      { user: deal.broker, role: 'broker' },
      {
        $inc: { successfulDeals: 1 },
        $push: { history: { type: 'deal', referenceId: deal._id, otpVerified: true } },
      },
      { upsert: true, new: true }
    );

    await Broker.updateOne(
      { user: deal.broker },
      { $inc: { 'milestones.successfulDeals': 1 } }
    );

    // Recalculate broker rank
    await recalculateUserRank(deal.broker);

    deal.status = DEAL_STATUS.COMPLETED;
    deal.closedAt = new Date();
    deal.closedBy = req.user._id;
    deal.milestoneUpdated = true;
    await deal.save();

    // Notify buyer + seller
    await Notification.create({
      user: deal.buyer,
      title: '🎉 Deal Completed',
      body: 'Your deal has been completed successfully!',
      type: 'success',
      link: `/deals/${deal._id}`,
    });
    await Notification.create({
      user: deal.seller,
      title: '🎉 Property Sold',
      body: 'Your property has been sold successfully!',
      type: 'success',
      link: `/deals/${deal._id}`,
    });

    return ApiResponse.success(
      res,
      { deal, deduction: deductionResult },
      'Deal completed successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/deals/my
 */
const getMyDeals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { buyer: req.user._id },
        { seller: req.user._id },
        { broker: req.user._id },
      ],
    };
    if (status) filter.status = status;

    const [deals, total] = await Promise.all([
      Deal.find(filter)
        .populate('property', 'title location photos price')
        .populate('buyer', 'fullName phone profileSlug')
        .populate('seller', 'fullName phone profileSlug')
        .populate('broker', 'fullName phone profileSlug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Deal.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, deals, page, limit, total, 'Deals fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/deals/:id
 */
const getDealById = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('property')
      .populate('buyer', 'fullName phone profileSlug')
      .populate('seller', 'fullName phone profileSlug')
      .populate('broker', 'fullName phone profileSlug');

    if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);

    const isParty = [deal.buyer?._id, deal.seller?._id, deal.broker?._id]
      .filter(Boolean)
      .some((id) => String(id) === String(req.user._id));

    if (!isParty && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    return ApiResponse.success(res, { deal }, 'Deal fetched');
  } catch (err) {
    next(err);
  }
};
/**
 * POST /api/v1/deals/:id/generate-agreement
 * Generate sale agreement PDF
 */
const generateSaleAgreement = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('seller', 'fullName email phone fatherName permanentAddress location')
      .populate('buyer', 'fullName email phone fatherName permanentAddress location')
      .populate('property', 'title propertyType location area khasraNumber');

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    }

    if (deal.status !== DEAL_STATUS.COMPLETED) {
      return ApiResponse.error(res, 'Deal must be completed first', HTTP_STATUS.BAD_REQUEST);
    }

    const isParty = [deal.buyer?._id, deal.seller?._id, deal.broker?._id]
      .filter(Boolean)
      .some((id) => String(id) === String(req.user._id));

    if (!isParty && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    if (!deal.agreementNumber) {
      const year = new Date().getFullYear();
      const random = crypto.randomInt(10000, 99999);
      deal.agreementNumber = `SA-${year}-${random}`;
    }

    const { generateSaleAgreement: genSalePdf } = require('../services/agreementService');
    const pdfUrl = await genSalePdf(deal);

    deal.agreementUrl = pdfUrl;
    deal.agreementGeneratedAt = new Date();
    await deal.save();

    return ApiResponse.success(res, {
      deal,
      agreementUrl: deal.agreementUrl,
      agreementNumber: deal.agreementNumber,
    }, 'Sale agreement generated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  initiateDeal,
  verifyDealOtp,
  completeDeal,
  getMyDeals,
  getDealById,
  generateSaleAgreement,   // 👈 YEH ADD KARO
};
