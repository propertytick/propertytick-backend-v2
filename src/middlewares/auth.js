const { verifyAccessToken } = require('../utils/generateToken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Verify JWT access token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return ApiResponse.error(res, 'Not authenticated. Please login.', HTTP_STATUS.UNAUTHORIZED);
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return ApiResponse.error(res, 'User not found', HTTP_STATUS.UNAUTHORIZED);
    }
    if (user.isBlocked) {
      return ApiResponse.error(res, 'Account blocked. Contact support.', HTTP_STATUS.FORBIDDEN);
    }
    if (!user.isActive) {
      return ApiResponse.error(res, 'Account inactive', HTTP_STATUS.FORBIDDEN);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Session expired. Please login again.', HTTP_STATUS.UNAUTHORIZED);
    }
    return ApiResponse.error(res, 'Invalid token', HTTP_STATUS.UNAUTHORIZED);
  }
};

/**
 * Optional auth — doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return next();

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password');
    if (user && !user.isBlocked && user.isActive) req.user = user;
  } catch (_) {
    // silently ignore
  }
  next();
};

module.exports = { protect, optionalAuth };
