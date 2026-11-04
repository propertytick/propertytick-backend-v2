const Newsletter = require('../models/Newsletter');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

const subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return ApiResponse.error(res, 'Email is required', HTTP_STATUS.BAD_REQUEST);

    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) {
      return ApiResponse.error(res, 'Email already subscribed', HTTP_STATUS.CONFLICT);
    }

    await Newsletter.create({ email: email.toLowerCase() });
    return ApiResponse.success(res, null, 'Subscribed successfully!');
  } catch (err) {
    next(err);
  }
};

const listSubscribers = async (req, res, next) => {
  try {
    const subscribers = await Newsletter.find({ isActive: true }).sort({ createdAt: -1 });
    return ApiResponse.success(res, { subscribers }, 'Subscribers fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = { subscribe, listSubscribers };