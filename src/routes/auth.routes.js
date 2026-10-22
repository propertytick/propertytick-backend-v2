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

const { createAndSendOtp, verifyOtp } = require('../services/otpService');

// 1. Send Mobile OTP
router.post('/send-mobile-otp', async (req, res) => {
  try {
    const { phone, fullName, email, userId, password, pincode, referralCode } = req.body;
    
    await createAndSendOtp(phone, 'registration', { fullName, email, userId, password, pincode, referralCode });
    
    res.status(200).json({ success: true, message: "OTP sent to mobile" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Verify Mobile OTP
// 2. Verify Mobile OTP
router.post('/verify-mobile-otp', async (req, res) => {
  try {
    const { phone, otp, role } = req.body;
    
    // Verify OTP
    const otpDoc = await verifyOtp(phone, otp, 'registration');
    if (!otpDoc) return res.status(400).json({ success: false, message: "Invalid OTP" });

    // ✅ OTP VERIFIED — Ab isko mark karein
    otpDoc.verifiedAt = new Date();
    otpDoc.isUsed = false; // Step 4 ke liye false rakhein
    otpDoc.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min extend
    await otpDoc.save();

    // Meta data nikaalein
    const metaData = otpDoc.meta; 

    res.status(200).json({ success: true, message: "OTP verified", user: metaData });
    
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
