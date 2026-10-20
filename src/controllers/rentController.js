const crypto = require('crypto');
const RentDeal = require('../models/RentDeal');
const Property = require('../models/Property');
const User = require('../models/User');
const AdminSettings = require('../models/AdminSettings');
const Otp = require('../models/Otp');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { sendOtpEmail } = require('../services/emailService');
const { HTTP_STATUS, PROPERTY_STATUS } = require('../config/constants');

/* =====================================================
   RENT POINTS — Balance & Purchase
   ===================================================== */

/**
 * GET /api/v1/rent/points/balance
 * Get user's current rent points balance
 */
const getPointsBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('rentPoints');
    const settings = await AdminSettings.getGlobal();

    const freeLimit = settings.fees?.rentFreeLimit || 3;
    const perPropertyPrice = settings.fees?.rentPerPropertyPrice || 100;
    const starterPackSize = settings.fees?.rentStarterPackSize || 10;
    const starterPackPrice = settings.fees?.rentStarterPackPrice || 1000;
    const growthPackSize = settings.fees?.rentGrowthPackSize || 20;
    const growthPackPrice = settings.fees?.rentGrowthPackPrice || 3000;

    return ApiResponse.success(res, {
      rentPoints: user.rentPoints || {
        balance: 0,
        freeUsed: 0,
        totalPurchased: 0,
        totalUsed: 0,
      },
      pricing: {
        freeLimit,
        perPropertyPrice,
        starterPack: { size: starterPackSize, price: starterPackPrice },
        growthPack: { size: growthPackSize, price: growthPackPrice },
      },
    }, 'Rent points balance fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/rent/points/purchase
 * Purchase rent points pack
 * Body: { packType: 'starter' | 'growth' }
 */


/* =====================================================
   RENT PROPERTY LISTING — With Points Deduction
   ===================================================== */

/**
 * POST /api/v1/rent/list
 * List a rent property (with points deduction logic)
 * Body: { propertyId }
 */
const deductPointOnListing = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      return ApiResponse.error(res, 'Property not found', HTTP_STATUS.NOT_FOUND);
    }

    if (String(property.owner) !== String(req.user._id)) {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    if (property.listingPurpose !== 'rent') {
      return ApiResponse.error(res, 'Property is not a rent listing', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findById(req.user._id);
    const settings = await AdminSettings.getGlobal();
    const freeLimit = settings.fees?.rentFreeLimit || 3;

    if (!user.rentPoints) {
      user.rentPoints = { balance: 0, freeUsed: 0, totalPurchased: 0, totalUsed: 0 };
    }

    // Free limit check
    if (user.rentPoints.freeUsed < freeLimit) {
      user.rentPoints.freeUsed += 1;
      await user.save();
      return ApiResponse.success(res, {
        deducted: false,
        freeUsed: user.rentPoints.freeUsed,
        freeLimit,
        balance: user.rentPoints.balance,
        message: `Free listing used (${user.rentPoints.freeUsed}/${freeLimit})`,
      }, 'Property listed (free tier)');
    }

    // Points deduction
    if (user.rentPoints.balance < 1) {
      return ApiResponse.error(
        res,
        'Insufficient rent points. Please purchase a pack to continue.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    user.rentPoints.balance -= 1;
    user.rentPoints.totalUsed += 1;
    await user.save();

    return ApiResponse.success(res, {
      deducted: true,
      balance: user.rentPoints.balance,
      totalUsed: user.rentPoints.totalUsed,
    }, '1 point deducted. Property listed.');
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   RENT DEAL — OTP Flow
   ===================================================== */

/**
 * Helper: generate 6-digit OTP
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * POST /api/v1/rent/deal/initiate
 * Owner initiates a rent deal with a tenant
 * Body: { propertyId, tenantId, rentAmount, depositAmount, startDate, duration }
 */
const initiateDeal = async (req, res, next) => {
  try {
    const {
  propertyId,
  tenantId,
  rentAmount,
  depositAmount,
  startDate,
  duration,
  maintenanceCharges,
  noticePeriod,
  ownerWitness,      // 👈 ADD
  tenantWitness,     // 👈 ADD
} = req.body;

    if (!propertyId || !tenantId || !rentAmount || !startDate) {
      return ApiResponse.error(res, 'Required fields missing', HTTP_STATUS.BAD_REQUEST);
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return ApiResponse.error(res, 'Property not found', HTTP_STATUS.NOT_FOUND);
    }

    if (String(property.owner) !== String(req.user._id)) {
      return ApiResponse.error(res, 'Only owner can initiate deal', HTTP_STATUS.FORBIDDEN);
    }

    if (property.listingPurpose !== 'rent') {
      return ApiResponse.error(res, 'Property is not for rent', HTTP_STATUS.BAD_REQUEST);
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) {
      return ApiResponse.error(res, 'Tenant not found', HTTP_STATUS.NOT_FOUND);
    }

    // Check if deal already exists
    const existingDeal = await RentDeal.findOne({
      property: propertyId,
      tenant: tenantId,
      status: { $in: ['pending', 'owner_verified', 'tenant_verified'] },
    });

    if (existingDeal) {
      return ApiResponse.error(res, 'Active deal already exists for this property', HTTP_STATUS.CONFLICT);
    }

    const deal = await RentDeal.create({
  property: propertyId,
  owner: req.user._id,
  tenant: tenantId,
  rentAmount,
  depositAmount: depositAmount || 0,
  startDate: new Date(startDate),
  duration: duration || 11,
  maintenanceCharges: maintenanceCharges || 0,
  noticePeriod: noticePeriod || 1,
  ownerWitness: ownerWitness || null,     // 👈 ADD
  tenantWitness: tenantWitness || null,   // 👈 ADD
  status: 'pending',
});

    return ApiResponse.success(res, { deal }, 'Deal initiated. Send OTPs to both parties.', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/rent/deal/:id/send-otp
 * Send OTP to owner and tenant for deal confirmation
 */
const sendDealOtp = async (req, res, next) => {
  try {
    const deal = await RentDeal.findById(req.params.id)
      .populate('owner', 'fullName email')
      .populate('tenant', 'fullName email');

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    }

    if (String(deal.owner._id) !== String(req.user._id) && String(deal.tenant._id) !== String(req.user._id)) {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    if (deal.status === 'completed' || deal.status === 'cancelled') {
      return ApiResponse.error(res, 'Deal already closed', HTTP_STATUS.BAD_REQUEST);
    }

    const ownerOtp = generateOtp();
    const tenantOtp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    deal.ownerOtp = crypto.createHash('sha256').update(ownerOtp).digest('hex');
    deal.ownerOtpExpiresAt = expiresAt;
    deal.ownerOtpAttempts = 0;

    deal.tenantOtp = crypto.createHash('sha256').update(tenantOtp).digest('hex');
    deal.tenantOtpExpiresAt = expiresAt;
    deal.tenantOtpAttempts = 0;

    await deal.save();

    // Send OTPs via email
    try {
      await sendOtpEmail(deal.owner.email, ownerOtp, 'deal_confirmation', deal.owner.fullName);
      await sendOtpEmail(deal.tenant.email, tenantOtp, 'deal_confirmation', deal.tenant.fullName);
    } catch (emailErr) {
      logger.error('Deal OTP email failed:', emailErr.message);
    }

    return ApiResponse.success(res, {
      dealId: deal._id,
      expiresIn: 600,
      message: 'OTPs sent to both owner and tenant',
    }, 'OTPs sent successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/rent/deal/:id/verify-otp
 * Verify OTP (owner or tenant)
 * Body: { otp, role: 'owner' | 'tenant' }
 */
const verifyDealOtp = async (req, res, next) => {
  try {
    const { otp, role } = req.body;

    if (!otp || !role || !['owner', 'tenant'].includes(role)) {
      return ApiResponse.error(res, 'OTP and role required', HTTP_STATUS.BAD_REQUEST);
    }

    const deal = await RentDeal.findById(req.params.id).select(
      '+ownerOtp +tenantOtp +ownerOtpExpiresAt +tenantOtpExpiresAt'
    );

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    }

    const isOwner = String(deal.owner) === String(req.user._id);
    const isTenant = String(deal.tenant) === String(req.user._id);

    if (!isOwner && !isTenant) {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    if (role === 'owner' && !isOwner) {
      return ApiResponse.error(res, 'Only owner can verify owner OTP', HTTP_STATUS.FORBIDDEN);
    }

    if (role === 'tenant' && !isTenant) {
      return ApiResponse.error(res, 'Only tenant can verify tenant OTP', HTTP_STATUS.FORBIDDEN);
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    if (role === 'owner') {
      if (!deal.ownerOtp || deal.ownerOtpExpiresAt < new Date()) {
        return ApiResponse.error(res, 'Owner OTP expired', HTTP_STATUS.BAD_REQUEST);
      }
      if (deal.ownerOtpAttempts >= 5) {
        return ApiResponse.error(res, 'Max attempts exceeded', HTTP_STATUS.TOO_MANY);
      }
      if (hashedOtp !== deal.ownerOtp) {
        deal.ownerOtpAttempts += 1;
        await deal.save();
        return ApiResponse.error(res, 'Invalid OTP', HTTP_STATUS.BAD_REQUEST);
      }
      deal.ownerVerifiedAt = new Date();
    } else {
      if (!deal.tenantOtp || deal.tenantOtpExpiresAt < new Date()) {
        return ApiResponse.error(res, 'Tenant OTP expired', HTTP_STATUS.BAD_REQUEST);
      }
      if (deal.tenantOtpAttempts >= 5) {
        return ApiResponse.error(res, 'Max attempts exceeded', HTTP_STATUS.TOO_MANY);
      }
      if (hashedOtp !== deal.tenantOtp) {
        deal.tenantOtpAttempts += 1;
        await deal.save();
        return ApiResponse.error(res, 'Invalid OTP', HTTP_STATUS.BAD_REQUEST);
      }
      deal.tenantVerifiedAt = new Date();
    }

    // Update status
    if (deal.ownerVerifiedAt && deal.tenantVerifiedAt) {
      deal.status = 'completed';
    } else if (deal.ownerVerifiedAt) {
      deal.status = 'owner_verified';
    } else if (deal.tenantVerifiedAt) {
      deal.status = 'tenant_verified';
    }

    await deal.save();

    // 🔻 Point deduction on completion
    if (deal.status === 'completed' && !deal.pointDeducted) {
      await deductPointOnDealComplete(deal);
    }

    return ApiResponse.success(res, {
      deal,
      status: deal.status,
      ownerVerified: !!deal.ownerVerifiedAt,
      tenantVerified: !!deal.tenantVerifiedAt,
    }, 'OTP verified');
  } catch (err) {
    next(err);
  }
};

/**
 * Helper: deduct 1 point from owner when deal completes
 */
const deductPointOnDealComplete = async (deal) => {
  try {
    const owner = await User.findById(deal.owner);
    if (!owner) return;

    if (!owner.rentPoints) {
      owner.rentPoints = { balance: 0, freeUsed: 0, totalPurchased: 0, totalUsed: 0 };
    }

    if (owner.rentPoints.balance > 0) {
      owner.rentPoints.balance -= 1;
      owner.rentPoints.totalUsed += 1;
      await owner.save();

      deal.pointDeducted = true;
      deal.pointDeductedFrom = 'owner';
      deal.pointDeductedAt = new Date();
      await deal.save();
    } else {
      logger.warn(`Deal ${deal._id} completed but owner has 0 points.`);
    }
  } catch (err) {
    logger.error('Point deduction on deal complete failed:', err.message);
  }
};

/* =====================================================
   RENT DEAL — Agreement Generation
   ===================================================== */

/**
 * POST /api/v1/rent/deal/:id/generate-agreement
 * Generate rent agreement (stub — actual PDF generation baad mein)
 */
const generateAgreement = async (req, res, next) => {
  try {
    const deal = await RentDeal.findById(req.params.id)
      .populate('owner', 'fullName email phone fatherName permanentAddress location')
      .populate('tenant', 'fullName email phone fatherName permanentAddress location')
      .populate('property', 'title propertyType location area khasraNumber');

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    }

    if (deal.status !== 'completed') {
      return ApiResponse.error(res, 'Both parties must verify OTP first', HTTP_STATUS.BAD_REQUEST);
    }

    if (String(deal.owner._id) !== String(req.user._id) && String(deal.tenant._id) !== String(req.user._id)) {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    // Generate agreement number
    if (!deal.agreementNumber) {
      const year = new Date().getFullYear();
      const random = crypto.randomInt(10000, 99999);
      deal.agreementNumber = `RA-${year}-${random}`;
    }

    // Generate PDF
    const { generateRentAgreement } = require('../services/agreementService');
    const pdfUrl = await generateRentAgreement(deal);

    deal.agreementUrl = pdfUrl;
    deal.agreementGeneratedAt = new Date();
    await deal.save();

    return ApiResponse.success(res, {
      deal,
      agreementUrl: deal.agreementUrl,
      agreementNumber: deal.agreementNumber,
    }, 'Agreement generated successfully');
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   RENT DEAL — Listing & Management
   ===================================================== */

/**
 * GET /api/v1/rent/deal/my
 * Get my deals (as owner or tenant)
 */
const getMyDeals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { owner: req.user._id },
        { tenant: req.user._id },
      ],
    };

    if (status) filter.status = status;

    const [deals, total] = await Promise.all([
      RentDeal.find(filter)
        .populate('property', 'title photos location price')
        .populate('owner', 'fullName phone profileSlug profilePhoto')
        .populate('tenant', 'fullName phone profileSlug profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      RentDeal.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, deals, page, limit, total, 'My rent deals fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/rent/deal/:id/cancel
 * Cancel a deal
 */
const cancelDeal = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const deal = await RentDeal.findById(req.params.id);

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    }

    if (String(deal.owner) !== String(req.user._id) && String(deal.tenant) !== String(req.user._id)) {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    if (deal.status === 'completed') {
      return ApiResponse.error(res, 'Completed deal cannot be cancelled', HTTP_STATUS.BAD_REQUEST);
    }

    deal.status = 'cancelled';
    deal.cancelledBy = req.user._id;
    deal.cancellationReason = reason || '';
    deal.cancelledAt = new Date();
    await deal.save();

    return ApiResponse.success(res, { deal }, 'Deal cancelled');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/rent/points/purchase
 * Purchase rent points pack (with part payment from existing points)
 * Body: { packType: 'starter' | 'growth', useExistingPoints: true }
 */
const purchasePoints = async (req, res, next) => {
  try {
    const { packType, useExistingPoints = false } = req.body;

    if (!packType || !['starter', 'growth'].includes(packType)) {
      return ApiResponse.error(res, 'Invalid pack type', HTTP_STATUS.BAD_REQUEST);
    }

    const settings = await AdminSettings.getGlobal();
    const fees = settings.fees || {};

    let packSize = 0;
    let packPrice = 0;
    let packName = '';

    if (packType === 'starter') {
      packSize = fees.rentStarterPackSize || 10;
      packPrice = fees.rentStarterPackPrice || 1000;
      packName = 'Starter Pack';
    } else {
      packSize = fees.rentGrowthPackSize || 20;
      packPrice = fees.rentGrowthPackPrice || 3000;
      packName = 'Growth Pack';
    }

    const user = await User.findById(req.user._id);
    if (!user) return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);

    if (!user.rentPoints) {
      user.rentPoints = { freeBalance: 3, paidBalance: 0, freeUsed: 0, totalPurchased: 0, totalUsed: 0, referralProgress: 0 };
    }

    const perPointPrice = packPrice / packSize;

    // Agar user existing points use karna chahta hai
    let pointsUsed = 0;
    let finalPrice = packPrice;
    let pointsToAdd = packSize;

    if (useExistingPoints && user.rentPoints.paidBalance > 0) {
      // Jitne paid points hain, utne ka discount
      pointsUsed = user.rentPoints.paidBalance;
      finalPrice = packPrice - (pointsUsed * perPointPrice);

      // Agar final price negative ho jaye to 0
      if (finalPrice < 0) finalPrice = 0;

      // Points to add = packSize (kyunki user ne pack kharida)
      // Lekin agar user ne saare points use kar liye to sirf remaining add honge
      // Actually, pack kharidne par poora packSize add hoga
      // pointsUsed sirf payment discount ke liye hai
    }

    // ⚠️ YEHAN PAYMENT GATEWAY INTEGRATE KARO — Razorpay/PhonePe
    // Final price = finalPrice
    // Abhi ke liye assume karte hain payment successful

    // Points update
    if (pointsUsed > 0) {
      user.rentPoints.paidBalance -= pointsUsed;
      user.rentPoints.totalUsed += pointsUsed;
    }

    user.rentPoints.paidBalance += packSize;
    user.rentPoints.totalPurchased += packSize;

    await user.save();

    return ApiResponse.success(res, {
      packName,
      pointsAdded: packSize,
      pointsUsed: pointsUsed,
      originalPrice: packPrice,
      finalPrice: finalPrice,
      savedAmount: packPrice - finalPrice,
      newPaidBalance: user.rentPoints.paidBalance,
      newFreeBalance: user.rentPoints.freeBalance,
    }, `${packName} purchased! ${packSize} points added.`);
  } catch (err) {
    next(err);
  }
};
/**
 * GET /api/v1/rent/deal/:id
 * Get single deal details
 */
const getDealById = async (req, res, next) => {
  try {
    const deal = await RentDeal.findById(req.params.id)
      .populate('property', 'title photos location area price')
      .populate('owner', 'fullName phone whatsapp profileSlug profilePhoto')
      .populate('tenant', 'fullName phone whatsapp profileSlug profilePhoto');

    if (!deal) {
      return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    }

    if (String(deal.owner._id) !== String(req.user._id) && String(deal.tenant._id) !== String(req.user._id)) {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    return ApiResponse.success(res, { deal }, 'Deal fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
