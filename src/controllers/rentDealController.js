const RentDeal = require('../models/RentDeal');
const Property = require('../models/Property');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');

/**
 * POST /api/v1/rent-deals/initiate
 * Owner or Broker initiates a rent deal
 */
const initiateRentDeal = async (req, res, next) => {
  try {
    const {
      propertyId,
      tenant, // { name, mobile, aadhaarNumber, photo }
      brokerPhoto,
      monthlyRent,
      securityDeposit,
      maintenanceCharges,
      agreementStartDate,
      agreementEndDate,
      noticePeriod
    } = req.body;

    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'active') {
      return ApiResponse.error(res, 'Property not available', HTTP_STATUS.BAD_REQUEST);
    }

    // Check if property is for rent
    if (property.listingPurpose !== 'rent') {
      return ApiResponse.error(res, 'Property is not listed for rent', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate required fields
    if (!tenant?.name || !tenant?.mobile) {
      return ApiResponse.error(res, 'Tenant name & mobile are required', HTTP_STATUS.BAD_REQUEST);
    }

    // Determine who is creating the deal
    const isOwner = String(property.owner) === String(req.user._id);
    const isBroker = req.user.role === 'broker';

    if (!isOwner && !isBroker) {
      return ApiResponse.error(res, 'Only owner or broker can initiate rent deal', HTTP_STATUS.FORBIDDEN);
    }

    // Create Rent Deal Document
    const rentDeal = await RentDeal.create({
      property: property._id,
      owner: property.owner,
      tenant: {
        name: tenant.name,
        mobile: tenant.mobile,
        aadhaarNumber: tenant.aadhaarNumber || '',
        photo: tenant.photo || ''
      },
      broker: isBroker ? req.user._id : null,
      brokerPhoto: brokerPhoto || '',
      monthlyRent: Number(monthlyRent),
      securityDeposit: Number(securityDeposit) || 0,
      maintenanceCharges: Number(maintenanceCharges) || 0,
      agreementStartDate: new Date(agreementStartDate),
      agreementEndDate: new Date(agreementEndDate),
      noticePeriod: Number(noticePeriod) || 1,
      listedBy: isOwner ? 'owner' : 'broker',
      status: 'draft'
    });

    // Set broker OTP requirement based on who listed the property
    rentDeal.otpVerification.broker.isRequired = rentDeal.isBrokerOtpRequired();
    await rentDeal.save();

    // DEMO: Trigger OTP to Tenant (First step)
    logger.info(`[DEMO] OTP sent to Tenant: ${tenant.mobile} for Rent Deal ${rentDeal._id}`);

    return ApiResponse.success(
      res,
      { 
        rentDealId: rentDeal._id, 
        nextStep: 'verify_tenant_otp',
        brokerOtpRequired: rentDeal.otpVerification.broker.isRequired
      },
      'Rent deal initiated. OTP sent to Tenant.',
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/rent-deals/:id/verify-otp
 * Sequential OTP Verification: Tenant -> Owner -> Broker (if required)
 */
const verifyRentDealOtp = async (req, res, next) => {
  try {
    const { otp, party } = req.body; // party: 'tenant', 'owner', or 'broker'
    const rentDeal = await RentDeal.findById(req.params.id);

    if (!rentDeal) return ApiResponse.error(res, 'Rent deal not found', HTTP_STATUS.NOT_FOUND);

    // Authorization check
    if (party === 'broker' && String(req.user._id) !== String(rentDeal.broker)) {
      return ApiResponse.error(res, 'Not authorized to verify broker OTP', HTTP_STATUS.FORBIDDEN);
    }

    // Get Phone Number based on party
    let phone = '';
    if (party === 'tenant') phone = rentDeal.tenant.mobile;
    else if (party === 'owner') {
      const ownerUser = await User.findById(rentDeal.owner).select('phone');
      phone = ownerUser.phone;
    }
    else if (party === 'broker') {
      if (!rentDeal.broker) {
        return ApiResponse.error(res, 'No broker associated with this deal', HTTP_STATUS.BAD_REQUEST);
      }
      const brokerUser = await User.findById(rentDeal.broker).select('phone');
      phone = brokerUser.phone;
    }

    // DEMO OTP Verification (Use '123456' for testing)
    if (otp !== '123456') {
      return ApiResponse.error(res, 'Invalid OTP (Demo: use 123456)', HTTP_STATUS.BAD_REQUEST);
    }

    // Sequential Logic
    if (party === 'tenant') {
      if (rentDeal.otpVerification.tenant.verified) {
        return ApiResponse.error(res, 'Tenant already verified', HTTP_STATUS.BAD_REQUEST);
      }
      rentDeal.otpVerification.tenant.verified = true;
      rentDeal.otpVerification.tenant.verifiedAt = new Date();
    } 
    else if (party === 'owner') {
      if (!rentDeal.otpVerification.tenant.verified) {
        return ApiResponse.error(res, 'Tenant OTP must be verified first', HTTP_STATUS.BAD_REQUEST);
      }
      if (rentDeal.otpVerification.owner.verified) {
        return ApiResponse.error(res, 'Owner already verified', HTTP_STATUS.BAD_REQUEST);
      }
      rentDeal.otpVerification.owner.verified = true;
      rentDeal.otpVerification.owner.verifiedAt = new Date();
    } 
    else if (party === 'broker') {
      // Check if broker OTP is required
      if (!rentDeal.otpVerification.broker.isRequired) {
        return ApiResponse.error(res, 'Broker OTP is not required for this deal', HTTP_STATUS.BAD_REQUEST);
      }
      if (!rentDeal.otpVerification.owner.verified) {
        return ApiResponse.error(res, 'Owner OTP must be verified first', HTTP_STATUS.BAD_REQUEST);
      }
      if (rentDeal.otpVerification.broker.verified) {
        return ApiResponse.error(res, 'Broker already verified', HTTP_STATUS.BAD_REQUEST);
      }
      rentDeal.otpVerification.broker.verified = true;
      rentDeal.otpVerification.broker.verifiedAt = new Date();
    }

    // Check if all required OTPs are verified
    if (rentDeal.isFullyVerified()) {
      rentDeal.status = 'agreement_verified';
    }

    await rentDeal.save();

    const nextStep = rentDeal.getNextOtpStep();
    return ApiResponse.success(res, { 
      rentDeal, 
      nextStep: nextStep ? `verify_${nextStep}_otp` : 'all_verified' 
    }, `${party} OTP verified successfully`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/rent-deals/:id/verify-aadhaar
 * DEMO: Verify Aadhaar for Tenant or Owner (Broker ka Aadhaar verify nahi hoga)
 */
const verifyRentDealAadhaar = async (req, res, next) => {
  try {
    const { party, aadhaarNumber, otp } = req.body; // party: 'tenant' or 'owner'
    const rentDeal = await RentDeal.findById(req.params.id);

    if (!rentDeal) return ApiResponse.error(res, 'Rent deal not found', HTTP_STATUS.NOT_FOUND);
    if (party === 'broker') {
      return ApiResponse.error(res, 'Broker Aadhaar verification not required', HTTP_STATUS.BAD_REQUEST);
    }

    // DEMO Logic: OTP '123456' is valid
    if (otp !== '123456') {
      return ApiResponse.error(res, 'Invalid Aadhaar OTP (Demo: use 123456)', HTTP_STATUS.BAD_REQUEST);
    }

    if (party === 'tenant') {
      rentDeal.tenant.aadhaarNumber = aadhaarNumber;
      rentDeal.tenant.aadhaarVerified = true;
      rentDeal.tenant.aadhaarVerifiedAt = new Date();
    } else if (party === 'owner') {
      // Owner is a User reference, so we'd need to store this separately or in User model
      // For now, we'll add a field to rent deal
      rentDeal.ownerAadhaarVerified = true;
      rentDeal.ownerAadhaarVerifiedAt = new Date();
    }

    await rentDeal.save();
    return ApiResponse.success(res, { rentDeal }, `${party} Aadhaar verified successfully (Demo)`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/rent-deals/:id/upload-documents
 * Upload Agreement/Kirayanama files (Max 10 files)
 */
const uploadRentDealDocuments = async (req, res, next) => {
  try {
    const { files } = req.body; // files: Array of URLs
    const rentDeal = await RentDeal.findById(req.params.id);

    if (!rentDeal) return ApiResponse.error(res, 'Rent deal not found', HTTP_STATUS.NOT_FOUND);
    
    // Only owner or broker can upload documents
    const isOwner = String(req.user._id) === String(rentDeal.owner);
    const isBroker = rentDeal.broker && String(req.user._id) === String(rentDeal.broker);
    
    if (!isOwner && !isBroker) {
      return ApiResponse.error(res, 'Only owner or broker can upload documents', HTTP_STATUS.FORBIDDEN);
    }

    if (!Array.isArray(files) || files.length === 0) {
      return ApiResponse.error(res, 'Please provide at least one file', HTTP_STATUS.BAD_REQUEST);
    }

    if (files.length > 10) {
      return ApiResponse.error(res, 'Maximum 10 files allowed', HTTP_STATUS.BAD_REQUEST);
    }

    rentDeal.agreementFiles = files;
    rentDeal.lastEditedBy = req.user._id;
    rentDeal.lastEditedAt = new Date();
    await rentDeal.save();

    return ApiResponse.success(res, { rentDeal }, 'Agreement documents uploaded successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/rent-deals/:id/update
 * Edit Rent Deal: Update agreement details or extend agreement
 */
const updateRentDeal = async (req, res, next) => {
  try {
    const { 
      agreementEndDate, 
      monthlyRent, 
      securityDeposit,
      noticePeriod 
    } = req.body;
    
    const rentDeal = await RentDeal.findById(req.params.id);

    if (!rentDeal) return ApiResponse.error(res, 'Rent deal not found', HTTP_STATUS.NOT_FOUND);
    
    // Only owner or broker can update
    const isOwner = String(req.user._id) === String(rentDeal.owner);
    const isBroker = rentDeal.broker && String(req.user._id) === String(rentDeal.broker);
    
    if (!isOwner && !isBroker) {
      return ApiResponse.error(res, 'Only owner or broker can update rent deal', HTTP_STATUS.FORBIDDEN);
    }

    if (agreementEndDate) rentDeal.agreementEndDate = new Date(agreementEndDate);
    if (monthlyRent) rentDeal.monthlyRent = Number(monthlyRent);
    if (securityDeposit !== undefined) rentDeal.securityDeposit = Number(securityDeposit);
    if (noticePeriod) rentDeal.noticePeriod = Number(noticePeriod);

    rentDeal.lastEditedBy = req.user._id;
    rentDeal.lastEditedAt = new Date();
    await rentDeal.save();

    return ApiResponse.success(res, { rentDeal }, 'Rent deal updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/rent-deals/my
 * Get all rent deals for the logged-in user (Owner, Tenant, or Broker)
 */
const getMyRentDeals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = {
      $or: [
        { owner: req.user._id },
        { 'tenant.mobile': req.user.phone },
        { broker: req.user._id }
      ]
    };
    
    if (status) filter.status = status;

    const [rentDeals, total] = await Promise.all([
      RentDeal.find(filter)
        .populate('property', 'title location photos price')
        .populate('owner', 'fullName phone profileSlug')
        .populate('broker', 'fullName phone profileSlug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RentDeal.countDocuments(filter)
    ]);

    return ApiResponse.paginated(res, rentDeals, page, limit, total, 'Rent deals fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/rent-deals/:id
 */
const getRentDealById = async (req, res, next) => {
  try {
    const rentDeal = await RentDeal.findById(req.params.id)
      .populate('property')
      .populate('owner', 'fullName phone profileSlug')
      .populate('broker', 'fullName phone profileSlug');
    
    if (!rentDeal) return ApiResponse.error(res, 'Rent deal not found', HTTP_STATUS.NOT_FOUND);
    
    // Authorization check
    const isOwner = String(rentDeal.owner?._id) === String(req.user._id);
    const isTenant = rentDeal.tenant?.mobile === req.user.phone;
    const isBroker = rentDeal.broker && String(rentDeal.broker?._id) === String(req.user._id);
    
    if (!isOwner && !isTenant && !isBroker && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    return ApiResponse.success(res, { rentDeal }, 'Rent deal fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  initiateRentDeal,
  verifyRentDealOtp,
  verifyRentDealAadhaar,
  uploadRentDealDocuments,
  updateRentDeal,
  getMyRentDeals,
  getRentDealById,
};