const rateLimit = require('express-rate-limit');
const { HTTP_STATUS } = require('../config/constants');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
    statusCode: HTTP_STATUS.TOO_MANY,
  });

// Global API limiter
const globalLimiter = createLimiter(
  15 * 60 * 1000, // 15 min
  300,
  'Too many requests from this IP. Please try again later.'
);

// Strict OTP limiter — per IP
const otpLimiter = createLimiter(
  10 * 60 * 1000, // 10 min
  10,
  'Too many OTP requests. Please wait 10 minutes.'
);

// Auth limiter
const authLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  'Too many login attempts. Please try again after 15 minutes.'
);

// Deal OTP closure limiter
const dealLimiter = createLimiter(
  60 * 60 * 1000,
  30,
  'Too many deal operations. Please try again later.'
);

module.exports = { globalLimiter, otpLimiter, authLimiter, dealLimiter };
