const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS, USER_ROLES } = require('../config/constants');

/**
 * Role-based access control
 * Usage: authorize(USER_ROLES.BROKER, USER_ROLES.ADMIN)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Not authenticated', HTTP_STATUS.UNAUTHORIZED);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        HTTP_STATUS.FORBIDDEN
      );
    }
    next();
  };
};

const adminOnly = authorize(USER_ROLES.ADMIN);

module.exports = { authorize, adminOnly };
