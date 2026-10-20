const express = require('express');
const router = express.Router();

const {
  sendOtp,
  verifyLoginOtp,
  registerBroker,
  registerAdvocate,
  registerColonizer,
  registerBuyer,
  registerSimple,
  refreshAccessToken,
  logout,
  getMe,
  getProfileBySlug,
  sendEmailOtp,
  verifyEmailOtp,
  loginEmailOtp,
  verifyLoginEmailOtp,
  updateProfile,
  login,
  forgotPassword,
  resetPassword,
  forgotUserId,
  getProfessionals,
  completeRegistration,        // 👈 YE ADD KARO
} = require('../controllers/authController');

const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const { otpLimiter, authLimiter } = require('../middlewares/rateLimiter');
const audit = require('../middlewares/auditLogger');
const {
  registerBrokerSchema,
  registerAdvocateSchema,
  registerColonizerSchema,
  registerBuyerSchema,
  registerSimpleSchema,
  loginWithOtpSchema,
  verifyOtpSchema,
} = require('../validators/authValidator');

// ---- Password Login ----
router.post('/login', authLimiter, audit('login', 'User'), login);

// ---- Password Reset ----
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/forgot-user-id', authLimiter, forgotUserId);

// ---- Mobile OTP ----
router.post('/send-otp', otpLimiter, validate(loginWithOtpSchema), audit('otp_send', 'Otp'), sendOtp);
router.post('/verify-login-otp', authLimiter, validate(verifyOtpSchema), audit('login', 'User'), verifyLoginOtp);

// ---- Email OTP Registration ----
router.post('/send-email-otp', otpLimiter, audit('otp_email_send', 'Otp'), sendEmailOtp);
router.post('/verify-email-otp', authLimiter, audit('register_email', 'User'), verifyEmailOtp);
router.post('/complete-registration', authLimiter, audit('register_complete', 'User'), completeRegistration);  // 👈 YE ADD KARO

// ---- Email OTP Login ----
router.post('/login-email-otp', otpLimiter, audit('otp_email_login', 'Otp'), loginEmailOtp);
router.post('/verify-login-email-otp', authLimiter, audit('login_email', 'User'), verifyLoginEmailOtp);

// ---- Public Professionals (no login required) ----
router.get('/professionals', getProfessionals);

// ---- Mobile Registration ----
router.post('/register/buyer', authLimiter, validate(registerBuyerSchema), audit('register', 'User'), registerBuyer);
router.post('/register/broker', authLimiter, validate(registerBrokerSchema), audit('register', 'Broker'), registerBroker);
router.post('/register/advocate', authLimiter, validate(registerAdvocateSchema), audit('register', 'Advocate'), registerAdvocate);
router.post('/register/colonizer', authLimiter, validate(registerColonizerSchema), audit('register', 'Colonizer'), registerColonizer);
router.post('/register/typist', authLimiter, validate(registerSimpleSchema), audit('register', 'Typist'), registerSimple);
router.post('/register/stamp-vendor', authLimiter, validate(registerSimpleSchema), audit('register', 'StampVendor'), registerSimple);

// ---- Session ----
router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// ---- Profile ----
router.patch('/profile', protect, audit('profile_update', 'User'), updateProfile);

// ---- Public Profile (Digital Visiting Card) ----
router.get('/profile/:slug', getProfileBySlug);

module.exports = router;
