const Deal = require('../models/Deal');
const Property = require('../models/Property');
const User = require('../models/User');
const Broker = require('../models/Broker');
const Milestone = require('../models/Milestone');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { consumePoint } = require('../services/walletService');
const { recalculateUserRank } = require('../services/rankingService');
const { HTTP_STATUS } = require('../config/constants');

const upload = require('../config/multer');
const { uploadMultipleFiles } = require('../services/fileUploadService');

const initiateDeal = async (req, res, next) => {
  try {
    const { propertyId, seller, buyer, brokerPhoto, totalAmount, advanceAmount, agreementDate, expectedRegistryDate } = req.body;

    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'active') {
      return ApiResponse.error(res, 'Property not available', HTTP_STATUS.BAD_REQUEST);
    }

    if (!seller?.name || !seller?.mobile || !buyer?.name || !buyer?.mobile) {
      return ApiResponse.error(res, 'Seller and Buyer name & mobile are required', HTTP_STATUS.BAD_REQUEST);
    }

    const isListedByOwner = String(property.owner) === String(req.user._id) || String(property.listedBy) === String(property.owner);

    const deal = await Deal.create({
      property: property._id,
      broker: req.user._id,
      seller: { name: seller.name, mobile: seller.mobile, aadhaarNumber: seller.aadhaarNumber || '', photo: seller.photo || '' },
      buyer: { name: buyer.name, mobile: buyer.mobile, aadhaarNumber: buyer.aadhaarNumber || '', photo: buyer.photo || '' },
      brokerPhoto: brokerPhoto || '',
      totalAmount: Number(totalAmount),
      advanceAmount: Number(advanceAmount),
      balanceAmount: Number(totalAmount) - Number(advanceAmount),
      agreementDate: new Date(agreementDate),
      expectedRegistryDate: new Date(expectedRegistryDate),
      status: 'draft',
      listedBy: isListedByOwner ? 'owner' : 'broker',
      brokerOtpRequired: !isListedByOwner
    });

    // 👇 DEAL INITIATE NOTIFICATION (Sirf Broker ko, kyunki seller/buyer embedded objects hain aur unhe SMS/OTP ja raha hai)
    await Notification.create({
      user: req.user._id,
      title: '🏠 Nayi Deal Proposal',
      body: `Aapne ₹${totalAmount} ki deal initiate ki hai. Ab OTP verification shuru karein.`,
      type: 'deal',
      link: `/deals/${deal._id}`
    });

    logger.info(`[DEMO] OTP sent to Seller: ${seller.mobile} for Deal ${deal._id}`);

    return ApiResponse.success(res, { dealId: deal._id, nextStep: 'verify_seller_otp', brokerOtpRequired: deal.brokerOtpRequired }, 'Deal initiated. OTP sent to Seller.', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

const verifyDealOtp = async (req, res, next) => {
  try {
    const { otp, party } = req.body; 
    const deal = await Deal.findById(req.params.id);
    if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);

    if (party === 'broker' && String(req.user._id) !== String(deal.broker)) {
      return ApiResponse.error(res, 'Not authorized to verify broker OTP', HTTP_STATUS.FORBIDDEN);
    }

    let phone = '';
    if (party === 'seller') phone = deal.seller.mobile;
    else if (party === 'buyer') phone = deal.buyer.mobile;
    else if (party === 'broker') {
      const brokerUser = await User.findById(deal.broker).select('phone');
      phone = brokerUser.phone;
    }

    if (otp !== '123456') {
       return ApiResponse.error(res, 'Invalid OTP (Demo: use 123456)', HTTP_STATUS.BAD_REQUEST);
    }

    if (party === 'seller') {
      if (deal.otpVerification.seller.verified) return ApiResponse.error(res, 'Seller already verified', HTTP_STATUS.BAD_REQUEST);
      deal.otpVerification.seller.verified = true;
      deal.otpVerification.seller.verifiedAt = new Date();
    } else if (party === 'buyer') {
      if (!deal.otpVerification.seller.verified) return ApiResponse.error(res, 'Seller OTP must be verified first', HTTP_STATUS.BAD_REQUEST);
      if (deal.otpVerification.buyer.verified) return ApiResponse.error(res, 'Buyer already verified', HTTP_STATUS.BAD_REQUEST);
      deal.otpVerification.buyer.verified = true;
      deal.otpVerification.buyer.verifiedAt = new Date();
    } else if (party === 'broker') {
      if (!deal.brokerOtpRequired) return ApiResponse.error(res, 'Broker OTP is not required for this deal', HTTP_STATUS.BAD_REQUEST);
      if (!deal.otpVerification.buyer.verified) return ApiResponse.error(res, 'Buyer OTP must be verified first', HTTP_STATUS.BAD_REQUEST);
      if (deal.otpVerification.broker.verified) return ApiResponse.error(res, 'Broker already verified', HTTP_STATUS.BAD_REQUEST);
      deal.otpVerification.broker.verified = true;
      deal.otpVerification.broker.verifiedAt = new Date();
    }

    if (deal.isFullyVerified()) deal.status = 'agreement_verified';
    await deal.save();

    const nextStep = deal.getNextOtpStep();
    return ApiResponse.success(res, { deal, nextStep: nextStep ? `verify_${nextStep}_otp` : 'all_verified' }, `${party} OTP verified successfully`);
  } catch (err) {
    next(err);
  }
};

const verifyAadhaar = async (req, res, next) => {
  try {
    const { party, aadhaarNumber, otp } = req.body; 
    const deal = await Deal.findById(req.params.id);
    if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    if (party === 'broker') return ApiResponse.error(res, 'Broker Aadhaar verification not required', HTTP_STATUS.BAD_REQUEST);

    if (otp !== '123456') return ApiResponse.error(res, 'Invalid Aadhaar OTP (Demo: use 123456)', HTTP_STATUS.BAD_REQUEST);

    if (party === 'seller') {
      deal.seller.aadhaarNumber = aadhaarNumber;
      deal.seller.aadhaarVerified = true;
      deal.seller.aadhaarVerifiedAt = new Date();
    } else if (party === 'buyer') {
      deal.buyer.aadhaarNumber = aadhaarNumber;
      deal.buyer.aadhaarVerified = true;
      deal.buyer.aadhaarVerifiedAt = new Date();
    }

    await deal.save();
    return ApiResponse.success(res, { deal }, `${party} Aadhaar verified successfully (Demo)`);
  } catch (err) {
    next(err);
  }
};

const uploadDealDocuments = async (req, res, next) => {
  try {
    const { type } = req.body; 
    const deal = await Deal.findById(req.params.id);

    if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    if (String(req.user._id) !== String(deal.broker)) return ApiResponse.error(res, 'Only broker can upload documents', HTTP_STATUS.FORBIDDEN);
    if (!['agreement', 'registry'].includes(type)) return ApiResponse.error(res, 'Invalid document type', HTTP_STATUS.BAD_REQUEST);
    if (!req.files || req.files.length === 0) return ApiResponse.error(res, 'Please provide at least one file', HTTP_STATUS.BAD_REQUEST);
    if (req.files.length > 20) return ApiResponse.error(res, 'Maximum 20 files allowed', HTTP_STATUS.BAD_REQUEST);

    const folder = `deals/${deal._id}/${type}`;
    const fileUrls = await uploadMultipleFiles(req.files, folder);

    if (type === 'agreement') {
      deal.agreementFiles = fileUrls;
      if (deal.status === 'draft') deal.status = 'agreement_uploaded';
    } else if (type === 'registry') {
      deal.registryFiles = fileUrls;
      deal.finalRegistryDate = new Date();
      deal.status = 'registry_completed';
    }

    deal.lastEditedBy = req.user._id;
    deal.lastEditedAt = new Date();
    await deal.save();

    return ApiResponse.success(res, { deal, fileUrls }, `${type} documents uploaded successfully`);
  } catch (err) {
    next(err);
  }
};

const updateDealRegistry = async (req, res, next) => {
  try {
    const { finalRegistryDate, registryFiles } = req.body;
    const deal = await Deal.findById(req.params.id);

    if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    if (String(req.user._id) !== String(deal.broker)) return ApiResponse.error(res, 'Only broker can update registry', HTTP_STATUS.FORBIDDEN);

    if (finalRegistryDate) deal.finalRegistryDate = new Date(finalRegistryDate);
    if (registryFiles && Array.isArray(registryFiles)) {
      if (registryFiles.length > 20) return ApiResponse.error(res, 'Max 20 registry files allowed', HTTP_STATUS.BAD_REQUEST);
      deal.registryFiles = registryFiles;
    }

    deal.status = 'registry_completed';
    deal.lastEditedBy = req.user._id;
    deal.lastEditedAt = new Date();
    await deal.save();

    await finalizeDeal(deal, req.user._id);
    return ApiResponse.success(res, { deal }, 'Registry updated and deal finalized');
  } catch (err) {
    next(err);
  }
};

const finalizeDeal = async (deal, userId) => {
  try {
    await consumePoint(deal.broker, 'deal', deal._id, `Deal closed for property ${deal.property}`);
    deal.pointDeducted = true;
    deal.pointDeductedAt = new Date();

    await Property.updateOne({ _id: deal.property }, { status: 'sold', soldAt: new Date() });
    await Milestone.findOneAndUpdate({ user: deal.broker, role: 'broker' }, { $inc: { successfulDeals: 1 } }, { upsert: true });
    await Broker.updateOne({ user: deal.broker }, { $inc: { 'milestones.successfulDeals': 1 } });
    await recalculateUserRank(deal.broker);

    deal.closedAt = new Date();
    deal.closedBy = userId;
    await deal.save();

    // 👇 DEAL COMPLETE NOTIFICATION (Try block ke andar, sirf Broker ke liye)
    await Notification.create({ 
      user: deal.broker, 
      title: '🎉 Deal Completed', 
      body: 'Badhai ho! Aapki property deal successfully complete aur verify ho gayi hai.', 
      type: 'deal', 
      link: `/deals/${deal._id}` 
    });
  } catch (err) {
    logger.error('Finalize deal error:', err.message);
  }
};

const getMyDeals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    const filter = { $or: [{ 'seller.mobile': req.user.phone }, { 'buyer.mobile': req.user.phone }, { broker: req.user._id }] };
    if (status) filter.status = status;

    const [deals, total] = await Promise.all([
      Deal.find(filter).populate('property', 'title location photos price').populate('broker', 'fullName phone profileSlug').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Deal.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, deals, page, limit, total, 'Deals fetched');
  } catch (err) {
    next(err);
  }
};

const getDealById = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id).populate('property').populate('broker', 'fullName phone profileSlug');
    if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);
    
    const isBroker = String(deal.broker?._id) === String(req.user._id);
    const isSeller = deal.seller?.mobile === req.user.phone;
    const isBuyer = deal.buyer?.mobile === req.user.phone;
    
    if (!isBroker && !isSeller && !isBuyer && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    return ApiResponse.success(res, { deal }, 'Deal fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  initiateDeal,
  verifyDealOtp,
  verifyAadhaar,
  uploadDealDocuments, 
  updateDealRegistry,
  getMyDeals,
  getDealById,
};