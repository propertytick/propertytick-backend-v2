const Rating = require('../models/Rating');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { recalculateUserRank, recalculateColonizerRank } = require('../services/rankingService');
const { RATING_TYPE, USER_ROLES, HTTP_STATUS } = require('../config/constants');

/**
 * POST /api/v1/ratings
 * Give rating to another user
 */
const createRating = async (req, res, next) => {
  try {
    const { toUserId, stars, review, dealId, propertyId } = req.body;

    if (String(toUserId) === String(req.user._id)) {
      return ApiResponse.error(res, 'Cannot rate yourself', HTTP_STATUS.BAD_REQUEST);
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);

    // Determine rating type
    let ratingType;
    if (req.user.role === USER_ROLES.BUYER) {
      if (toUser.role === USER_ROLES.BROKER) ratingType = RATING_TYPE.BUYER_TO_BROKER;
      else if (toUser.role === USER_ROLES.ADVOCATE) ratingType = RATING_TYPE.BUYER_TO_ADVOCATE;
      else if (toUser.role === USER_ROLES.COLONIZER) ratingType = RATING_TYPE.BUYER_TO_COLONIZER;
      else if (toUser.role === USER_ROLES.TYPIST) ratingType = RATING_TYPE.BUYER_TO_TYPIST;
      else if (toUser.role === USER_ROLES.STAMP_VENDOR) ratingType = RATING_TYPE.BUYER_TO_STAMP_VENDOR;
    } else if (req.user.role === USER_ROLES.BROKER && toUser.role === USER_ROLES.BUYER) {
      ratingType = RATING_TYPE.BROKER_TO_BUYER;
    }

    if (!ratingType) {
      return ApiResponse.error(res, 'Rating not allowed between these roles', HTTP_STATUS.FORBIDDEN);
    }

    // If deal-based, verify user was part of the deal
    if (dealId) {
      const deal = await Deal.findById(dealId);
      if (!deal) return ApiResponse.error(res, 'Deal not found', HTTP_STATUS.NOT_FOUND);

      const isParty = [deal.buyer, deal.seller, deal.broker]
        .filter(Boolean)
        .some((id) => String(id) === String(req.user._id));

      if (!isParty) {
        return ApiResponse.error(res, 'You were not part of this deal', HTTP_STATUS.FORBIDDEN);
      }
    }

    const rating = await Rating.create({
      fromUser: req.user._id,
      toUser: toUserId,
      ratingType,
      stars,
      review,
      deal: dealId,
      property: propertyId,
    });

    // Recalculate target's rating average
    await recalculateUserRating(toUserId);

    // Notify target
    await Notification.create({
      user: toUserId,
      title: `⭐ New ${stars}-star rating`,
      body: review ? review.substring(0, 100) : 'Someone rated you',
      type: 'rating',
    });

    return ApiResponse.success(res, { rating }, 'Rating submitted', HTTP_STATUS.CREATED);
  } catch (err) {
    if (err.code === 11000) {
      return ApiResponse.error(res, 'You already rated this user for this deal', HTTP_STATUS.CONFLICT);
    }
    next(err);
  }
};

/**
 * Recalculate user rating average + count
 */
const recalculateUserRating = async (userId) => {
  const agg = await Rating.aggregate([
    { $match: { toUser: require('mongoose').Types.ObjectId.createFromHexString(String(userId)), isVisible: true } },
    { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
  ]);

  const avg = agg[0]?.avg || 0;
  const count = agg[0]?.count || 0;

  await User.updateOne(
    { _id: userId },
    { $set: { 'rating.average': Math.round(avg * 100) / 100, 'rating.count': count } }
  );

  await recalculateUserRank(userId);
};

/**
 * GET /api/v1/ratings/user/:id
 */
const getUserRatings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { toUser: req.params.id, isVisible: true };

    const [ratings, total] = await Promise.all([
      Rating.find(filter)
        .populate('fromUser', 'fullName profilePhoto role profileSlug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Rating.countDocuments(filter),
    ]);

    const user = await User.findById(req.params.id).select('rating fullName profilePhoto role');

    return ApiResponse.paginated(
      res,
      { ratings, summary: user?.rating, name: user?.fullName },
      page,
      limit,
      total,
      'Ratings fetched'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/ratings/:id
 */
const deleteRating = async (req, res, next) => {
  try {
    const rating = await Rating.findById(req.params.id);
    if (!rating) return ApiResponse.error(res, 'Rating not found', HTTP_STATUS.NOT_FOUND);

    if (String(rating.fromUser) !== String(req.user._id) && req.user.role !== 'admin') {
      return ApiResponse.error(res, 'Not authorized', HTTP_STATUS.FORBIDDEN);
    }

    const toUserId = rating.toUser;
    await rating.deleteOne();
    await recalculateUserRating(toUserId);

    return ApiResponse.success(res, null, 'Rating deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRating,
  getUserRatings,
  deleteRating,
};
