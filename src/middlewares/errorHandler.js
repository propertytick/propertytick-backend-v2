const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

const notFound = (req, res, next) => {
  return ApiResponse.error(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    HTTP_STATUS.NOT_FOUND
  );
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid resource ID';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `${field} already exists`;
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expired';
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}: ${err.message}`, { stack: err.stack });
  }

  return ApiResponse.error(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? err.stack : null
  );
};

module.exports = { notFound, errorHandler };
