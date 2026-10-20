const Property = require('../models/Property');
const User = require('../models/User');
const PropertyShield = require('../models/PropertyShield');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { convertToAll, pricePerUnit } = require('../services/landConverter');
const { PROPERTY_STATUS, HTTP_STATUS } = require('../config/constants');

/**
 * GET /api/v1/properties/:id/card
 * Generate property card JPG for WhatsApp sharing
 */
const generatePropertyCardImage = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
  .populate('owner', 'fullName phone whatsapp referralCode fatherName permanentAddress location shopName shopAddress shopLandmark shopPincode businessHours')
  .populate('listedBy', 'fullName phone whatsapp referralCode fatherName permanentAddress location shopName shopAddress shopLandmark shopPincode businessHours');

    if (!property) {
      return ApiResponse.error(res, 'Property not found', HTTP_STATUS.NOT_FOUND);
    }

    const { generatePropertyCard } = require('../services/propertyCardService');
    const cardUrl = await generatePropertyCard(
      property,
      property.owner,
      property.owner?.referralCode
    );

    return ApiResponse.success(res, {
      cardUrl,
      fullUrl: `${req.protocol}://${req.get('host')}${cardUrl}`,
    }, 'Property card generated');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/properties
 * Create a new property listing
 */
const createProperty = async (req, res, next) => {
  try {
    const data = req.body;

    // Check khasra lock
    if (data.khasraNumber && data.location?.district) {
      const shield = await PropertyShield.findOne({
        khasraNumber: data.khasraNumber,
        district: data.location.district,
        isLocked: true,
      });

      if (shield && String(shield.user) !== String(req.user._id)) {
        return ApiResponse.error(
          res,
          'This Khasra is protected by another owner (Property Shield). Cannot list.',
          HTTP_STATUS.FORBIDDEN
        );
      }
    }

    // Auto-convert area
    const converted = convertToAll(data.area.value, data.area.unit);
    const sqftConverted = converted.sqft;

    // Handle photos (either from body or uploaded)
    let photoUrls = data.photos || [];
    if (data.uploadedPhotos && Array.isArray(data.uploadedPhotos)) {
      photoUrls = [...photoUrls, ...data.uploadedPhotos];
    }

    const property = await Property.create({
      ...data,
      photos: photoUrls,
      owner: req.user._id,
      listedBy: req.user._id,
      listedByRole: req.user.role,
      'area.sqftConverted': sqftConverted,
      'price.pricePerSqft': pricePerUnit(data.price.amount, data.area.value, data.area.unit),
      promotion: {
        isPaid: false,
        priorityScore: (req.user.rating?.starRank || 0) + (data.exchangeAvailable ? 5 : 0),
      },
    });

    return ApiResponse.success(res, { property }, 'Property listed successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/properties
 * List properties with filters + search
 */
	  /**
 * GET /api/v1/properties
 * List properties with filters + search
 */
const listProperties = async (req, res, next) => {
  try {
    console.log('');
    console.log('==============================================');
    console.log('🚨 LIST PROPERTIES HIT');
    console.log('   req.query:', JSON.stringify(req.query));
    console.log('==============================================');

    const {
      search, q, city, state, pincode, propertyType,
      listingPurpose, type, purpose,
      minPrice, maxPrice,
      minArea, maxArea, unit, exchangeAvailable, status,
      page = 1, limit = 20, sortBy = 'priorityScore', sortOrder = 'desc',
    } = req.query;

    // ✅ Pehle filter banao
    const filter = { deletedAt: null, isActive: true };

    if (propertyType) filter.propertyType = propertyType;

    // ✅ Listing purpose — type, purpose, listingPurpose sab handle
    const finalPurpose = listingPurpose || type || purpose;
    if (finalPurpose) {
      const lowerValue = String(finalPurpose).toLowerCase();
      const validPurposes = ['buy', 'rent', 'lease', 'exchange'];
      const validTypes = ['plot', 'land', 'house', 'flat', 'shop', 'agriculture', 'commercial', 'industrial'];

      if (validPurposes.includes(lowerValue)) {
        filter.listingPurpose = lowerValue;
      } else if (validTypes.includes(lowerValue)) {
        filter.propertyType = lowerValue;
      }
    }

    if (city) filter['location.city'] = { $regex: city, $options: 'i' };
    if (state) filter['location.state'] = state;
    if (pincode) filter['location.pincode'] = pincode;
    if (exchangeAvailable === 'true') filter.exchangeAvailable = true;
    if (status) filter.status = status;

    if (minPrice || maxPrice) {
      filter['price.amount'] = {};
      if (minPrice) filter['price.amount'].$gte = Number(minPrice);
      if (maxPrice) filter['price.amount'].$lte = Number(maxPrice);
    }
    if (minArea || maxArea) {
      filter['area.sqftConverted'] = {};
      if (minArea) filter['area.sqftConverted'].$gte = Number(minArea) * (unit === 'bigha' ? 27000 : unit === 'gaz' ? 9 : 1);
      if (maxArea) filter['area.sqftConverted'].$lte = Number(maxArea) * (unit === 'bigha' ? 27000 : unit === 'gaz' ? 9 : 1);
    }

    // ✅ Search — q aur search dono handle
    const searchTerm = search || q;
    if (searchTerm) {
      filter.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { khasraNumber: { $regex: searchTerm, $options: 'i' } },
        { 'location.landmark': { $regex: searchTerm, $options: 'i' } },
        { 'location.pincode': { $regex: searchTerm, $options: 'i' } },
        { 'location.city': { $regex: searchTerm, $options: 'i' } },
      ];
    }

    console.log('🚨 FINAL FILTER:', JSON.stringify(filter));
    console.log('==============================================');
    console.log('');

    const skip = (page - 1) * limit;
    const sort = { 'promotion.priorityScore': -1, createdAt: -1 };

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate('owner', 'fullName phone profileSlug profilePhoto rating role')
        .populate('listedBy', 'fullName phone profileSlug rating role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.countDocuments(filter),
    ]);

    console.log('🚨 Found properties:', properties.length, '| Total:', total);
    console.log('');

    return ApiResponse.paginated(res, properties, page, limit, total, 'Properties fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/properties/:id
 */
const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'fullName phone whatsapp profileSlug profilePhoto rating role')
      .populate('listedBy', 'fullName phone whatsapp profileSlug profilePhoto rating role');

    if (!property || property.deletedAt) {
      return ApiResponse.error(res, 'Property not found', HTTP_STATUS.NOT_FOUND);
    }

    // Increment views (non-blocking)
    Property.updateOne({ _id: property._id }, { $inc: { views: 1 } }).exec();

    // Convert area to all units for display
    const allUnits = convertToAll(property.area.value, property.area.unit);

    return ApiResponse.success(res, { property, areaInAllUnits: allUnits }, 'Property fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/properties/:id
 */
const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return ApiResponse.error(res, 'Property not found', HTTP_STATUS.NOT_FOUND);

    if (String(property.owner) !== String(req.user._id) && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized to edit this property', HTTP_STATUS.FORBIDDEN);
    }

    Object.assign(property, req.body);

    if (req.body.area) {
      const converted = convertToAll(property.area.value, property.area.unit);
      property.area.sqftConverted = converted.sqft;
    }

    await property.save();
    return ApiResponse.success(res, { property }, 'Property updated');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/properties/:id (soft delete)
 */
const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return ApiResponse.error(res, 'Property not found', HTTP_STATUS.NOT_FOUND);

    if (String(property.owner) !== String(req.user._id) && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    property.deletedAt = new Date();
    property.isActive = false;
    await property.save();

    return ApiResponse.success(res, null, 'Property deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/properties/my
 * Get my listings
 */
const getMyProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      Property.find({ owner: req.user._id, deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.countDocuments({ owner: req.user._id, deletedAt: null }),
    ]);

    return ApiResponse.paginated(res, properties, page, limit, total, 'My properties fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/properties/lock-shield
 * Lock a property from being listed by others (Property Shield)
 */
const lockPropertyShield = async (req, res, next) => {
  try {
    const { khasraNumber, district, tehsil, village } = req.body;

    const shield = await PropertyShield.findOneAndUpdate(
      { khasraNumber, user: req.user._id },
      {
        khasraNumber,
        district,
        tehsil,
        village,
        user: req.user._id,
        isLocked: true,
        lockedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return ApiResponse.success(res, { shield }, 'Property Shield activated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProperty,
  listProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getMyProperties,
  lockPropertyShield,
  generatePropertyCardImage,
};
