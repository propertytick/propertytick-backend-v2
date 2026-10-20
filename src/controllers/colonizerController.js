const Colonizer = require('../models/Colonizer');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

/**
 * GET /api/v1/colonizers
 */
const listColonizers = async (req, res, next) => {
  try {
    const { search, pincode, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (pincode) filter.pincode = pincode;
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { projectAddress: { $regex: search, $options: 'i' } },
        { landmark: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [colonizers, total] = await Promise.all([
      Colonizer.find(filter)
        .populate('user', 'fullName phone profileSlug profilePhoto rating')
        .sort({ 'promotion.priorityScore': -1, 'rating.average': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Colonizer.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, colonizers, page, limit, total, 'Colonizers fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/colonizers/:id
 */
const getColonizerById = async (req, res, next) => {
  try {
    const colonizer = await Colonizer.findById(req.params.id)
      .populate('user', 'fullName phone whatsapp email profileSlug profilePhoto rating socialLinks location');

    if (!colonizer) return ApiResponse.error(res, 'Colonizer not found', HTTP_STATUS.NOT_FOUND);

    return ApiResponse.success(res, { colonizer }, 'Colonizer fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/colonizers/me
 */
const updateMyColonizer = async (req, res, next) => {
  try {
    const colonizer = await Colonizer.findOne({ user: req.user._id });
    if (!colonizer) return ApiResponse.error(res, 'Colonizer profile not found', HTTP_STATUS.NOT_FOUND);

    // Handle photos upload
    const allowed = [
      'projectName', 'description', 'projectAddress', 'pincode', 'landmark',
      'contactNumber', 'agents', 'layoutMap', 'photos', 'videos',
    ];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) colonizer[k] = req.body[k];
    });

    await colonizer.save();
    return ApiResponse.success(res, { colonizer }, 'Colonizer updated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/colonizers/:id/card
 * Generate colonizer card JPG for WhatsApp sharing
 */
const generateColonizerCardImage = async (req, res, next) => {
  try {
    const colonizer = await Colonizer.findById(req.params.id)
      .populate('user', 'fullName phone whatsapp shopName location');

    if (!colonizer) {
      return ApiResponse.error(res, 'Colonizer not found', HTTP_STATUS.NOT_FOUND);
    }

    const { generateColonizerCard } = require('../services/propertyCardService');
    const cardUrl = await generateColonizerCard(colonizer);

    return ApiResponse.success(res, {
      cardUrl,
      fullUrl: `${req.protocol}://${req.get('host')}${cardUrl}`,
    }, 'Colonizer card generated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listColonizers,
  getColonizerById,
  updateMyColonizer,
  generateColonizerCardImage,   // 👈 YEH ADD KARO
};
