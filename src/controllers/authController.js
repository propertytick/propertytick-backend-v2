const crypto = require('crypto');
const { trackReferral } = require('./referralController');
const User = require('../models/User');
const Broker = require('../models/Broker');
const Advocate = require('../models/Advocate');
const Colonizer = require('../models/Colonizer');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { createAndSendOtp, verifyOtp } = require('../services/otpService');
const { sendOtpEmail, sendWelcomeEmail } = require('../services/emailService');
const {
  generateAccessToken,
  generateRefreshToken,
  refreshCookieOptions,
} = require('../utils/generateToken');
const { USER_ROLES, HTTP_STATUS } = require('../config/constants');

/**
 * Helper: build unique slug from name
 */
const buildSlug = (name, suffix) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const random = Math.random().toString(36).slice(-4);   // 👈 YEH LINE ADD KARO
  return `${base}-${suffix.slice(-4)}-${random}`;
};

/* =====================================================
   MOBILE OTP — Send & Verify
   ===================================================== */

const sendOtp = async (req, res, next) => {
  try {
    const { phone, purpose } = req.body;
    const result = await createAndSendOtp(phone, purpose);
    return ApiResponse.success(res, result, 'OTP sent successfully');
  } catch (err) {
    next(err);
  }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const { phone, otp, purpose } = req.body;

    await verifyOtp(phone, otp, purpose);

    const user = await User.findOne({ phone });
    if (!user) {
      return ApiResponse.error(res, 'User not found. Please register.', HTTP_STATUS.NOT_FOUND);
    }
    if (user.isBlocked) {
      return ApiResponse.error(res, 'Account blocked. Contact support.', HTTP_STATUS.FORBIDDEN);
    }

    user.isPhoneVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON(), accessToken },
      'Login successful'
    );
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   EMAIL OTP REGISTRATION
   ===================================================== */

const sendEmailOtp = async (req, res, next) => {
  try {
    const { email, phone, fullName, userId, password, pincode, referralCode } = req.body;

    if (!email || !phone || !fullName || !userId || !password) {
      return ApiResponse.error(res, 'All fields are required', HTTP_STATUS.BAD_REQUEST);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ApiResponse.error(res, 'Invalid email address', HTTP_STATUS.BAD_REQUEST);
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return ApiResponse.error(res, 'Invalid mobile number', HTTP_STATUS.BAD_REQUEST);
    }

    if (!/^[a-z0-9_]{4,30}$/.test(userId.toLowerCase())) {
      return ApiResponse.error(
        res,
        'User ID must be 4-30 characters (only letters, numbers, and underscore)',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/~`';]/;
    if (password.length < 8) {
      return ApiResponse.error(res, 'Password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
    }
    if (!specialCharRegex.test(password)) {
      return ApiResponse.error(
        res,
        'Password must contain at least one special character',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (pincode && !/^[1-9][0-9]{5}$/.test(pincode)) {
      return ApiResponse.error(res, 'Invalid pincode', HTTP_STATUS.BAD_REQUEST);
    }

        const existingUser = await User.findOne({
      deletedAt: null,
      isActive: true,
      $or: [{ email: email.toLowerCase() }, { phone }, { userId: userId.toLowerCase() }],
    });

            if (existingUser) {
      // 🔍 Check karo registration COMPLETE hai ya nahi
      if (!existingUser.isRegistrationComplete) {
        console.log('🗑️ Auto-deleting incomplete user in completeRegistration:', existingUser.email);
        await User.findByIdAndDelete(existingUser._id);
      } else {
        return ApiResponse.error(res, 'User already exists. Please login.', HTTP_STATUS.CONFLICT);
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const Otp = require('../models/Otp');
    await Otp.deleteMany({ phone: `email:${email}`, purpose: 'registration' });

    await Otp.create({
      phone: `email:${email}`,
      otpHash: hashedOtp,
      purpose: 'registration',
      meta: {
  email, phone, fullName, userId, password, pincode,
  referralCode,  // 👈 ADD
},
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(email, otp, 'email_verification', fullName);

    return ApiResponse.success(
      res,
      { email, expiresIn: 300 },
      'OTP sent to your email successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/auth/profile
 * Update own profile (photo, bio, shop details, social links)
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowed = [
      'fullName', 'bio', 'whatsapp', 'profilePhoto',
      'shopPhotos', 'shopName', 'shopAddress', 'shopLandmark',
      'shopPincode', 'shopCoordinates', 'businessHours', 'experience',
    ];

    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    // Social links — merge
    if (req.body.socialLinks) {
      updates.socialLinks = { ...req.user.socialLinks, ...req.body.socialLinks };
    }

    // Location — merge
    if (req.body.location) {
      updates.location = { ...req.user.location.toObject?.() || {}, ...req.body.location };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    return ApiResponse.success(res, { user: user.toSafeJSON() }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

// ==================== VERIFY EMAIL OTP ====================
const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp, role } = req.body;

    if (!email || !otp || !role) {
      return ApiResponse.error(res, 'Email, OTP and role are required', HTTP_STATUS.BAD_REQUEST);
    }

    const Otp = require('../models/Otp');
    const otpDoc = await Otp.findOne({
      phone: `email:${email}`,
      purpose: 'registration',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return ApiResponse.error(res, 'OTP expired or not found. Please request a new one.', HTTP_STATUS.BAD_REQUEST);
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      return ApiResponse.error(res, 'Maximum attempts exceeded. Request a new OTP.', HTTP_STATUS.TOO_MANY);
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedOtp !== otpDoc.otpHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return ApiResponse.error(
        res,
        `Invalid OTP. ${otpDoc.maxAttempts - otpDoc.attempts} attempts left.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // ✅ OTP VERIFIED — Magar user abhi create nahi karo
        
    otpDoc.isUsed = false;
    otpDoc.verifiedAt = new Date();
    otpDoc.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 👈 30 min extend karo Step 4 ke liye
    await otpDoc.save();

    // Buyer/Typist/StampVendor — direct registration
        if (['buyer', 'typist', 'stamp_vendor', 'rent'].includes(role)) {
      return await completeRegistration(req, res, next, true);
    }

    // Broker/Advocate/Colonizer — Step 4 ke liye prepare
    return ApiResponse.success(
      res,
      {
        email,
        role,
        verified: true,
        message: 'OTP verified. Please complete your profile.',
      },
      'OTP verified successfully'
    );
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   EMAIL OTP LOGIN
   ===================================================== */

const loginEmailOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ApiResponse.error(res, 'Email is required', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { userId: email.toLowerCase() },
      ],
    });

    if (!user) {
      return ApiResponse.error(res, 'No account found. Please register.', HTTP_STATUS.NOT_FOUND);
    }

    if (user.isBlocked) {
      return ApiResponse.error(res, 'Account blocked. Contact support.', HTTP_STATUS.FORBIDDEN);
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const Otp = require('../models/Otp');
    await Otp.deleteMany({ phone: `email:${user.email}`, purpose: 'login' });

    await Otp.create({
      phone: `email:${user.email}`,
      otpHash: hashedOtp,
      purpose: 'login',
      meta: { email: user.email, userId: user.userId },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(user.email, otp, 'login', user.fullName);

    return ApiResponse.success(
      res,
      { email: user.email, expiresIn: 300 },
      'Login OTP sent to your email'
    );
  } catch (err) {
    next(err);
  }
};

const verifyLoginEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return ApiResponse.error(res, 'Email and OTP are required', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { userId: email.toLowerCase() },
      ],
    });

    if (!user) {
      return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);
    }

    const Otp = require('../models/Otp');
    const otpDoc = await Otp.findOne({
      phone: `email:${user.email}`,
      purpose: 'login',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return ApiResponse.error(res, 'OTP expired or not found', HTTP_STATUS.BAD_REQUEST);
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      return ApiResponse.error(res, 'Maximum attempts exceeded. Request a new OTP.', HTTP_STATUS.TOO_MANY);
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedOtp !== otpDoc.otpHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return ApiResponse.error(
        res,
        `Invalid OTP. ${otpDoc.maxAttempts - otpDoc.attempts} attempts left.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    otpDoc.isUsed = true;
    await otpDoc.save();

    user.lastLoginAt = new Date();
    user.isEmailVerified = true;
    await user.save();

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON(), accessToken },
      'Login successful'
    );
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   MOBILE REGISTRATION — Legacy endpoints
   ===================================================== */

const registerBroker = async (req, res, next) => {
  try {
    const { fullName, phone, email, password, agencyName, experienceYears, operatingAreas, reraNumber } = req.body;

    // ✅ UPDATED: deletedAt aur isActive check add kiya
    const exists = await User.findOne({ 
      deletedAt: null, 
      isActive: true, 
      $or: [{ phone }, { email }] 
    });
    
    if (exists) {
      return ApiResponse.error(res, 'User already exists with this phone or email', HTTP_STATUS.CONFLICT);
    }

    const user = await User.create({
      fullName, phone, email, password,
      role: USER_ROLES.BROKER,
      profileSlug: buildSlug(fullName, phone),
    });

    const broker = await Broker.create({
      user: user._id, agencyName, experienceYears, operatingAreas, reraNumber,
    });

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON(), broker, accessToken },
      'Broker registered. Please complete KYC.',
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

const registerAdvocate = async (req, res, next) => {
  try {
    const { fullName, phone, email, password, barCouncilNumber, enrollmentYear, courtName, services } = req.body;

    // ✅ UPDATED: deletedAt aur isActive check add kiya
    const exists = await User.findOne({ 
      deletedAt: null, 
      isActive: true, 
      $or: [{ phone }, { email }] 
    });
    
    if (exists) return ApiResponse.error(res, 'User already exists', HTTP_STATUS.CONFLICT);

    const user = await User.create({
      fullName, phone, email, password,
      role: USER_ROLES.ADVOCATE,
      profileSlug: buildSlug(fullName, phone),
    });

    const advocate = await Advocate.create({
      user: user._id, barCouncilNumber, enrollmentYear, courtName, services,
    });

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON(), advocate, accessToken },
      'Advocate registered. Please complete KYC.',
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

const registerColonizer = async (req, res, next) => {
  try {
    const { fullName, phone, email, password, projectName, projectAddress, pincode, landmark, contactNumber, agents } = req.body;

    // ✅ UPDATED: deletedAt aur isActive check add kiya
    const exists = await User.findOne({ 
      deletedAt: null, 
      isActive: true, 
      $or: [{ phone }, { email }] 
    });
    
    if (exists) return ApiResponse.error(res, 'User already exists', HTTP_STATUS.CONFLICT);

    const user = await User.create({
      fullName, phone, email, password,
      role: USER_ROLES.COLONIZER,
      profileSlug: buildSlug(fullName, phone),
    });

    const colonizer = await Colonizer.create({
      user: user._id,
      projectName,
      projectSlug: buildSlug(projectName, phone),
      projectAddress, pincode, landmark, contactNumber,
      agents: agents || [],
    });

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON(), colonizer, accessToken },
      'Colonizer registered successfully',
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

const registerBuyer = async (req, res, next) => {
  try {
    const { fullName, phone, email, password } = req.body;

    // ✅ UPDATED: deletedAt aur isActive check add kiya
    const exists = await User.findOne({ 
      phone, 
      deletedAt: null, 
      isActive: true 
    });
    
    if (exists) return ApiResponse.error(res, 'User already exists', HTTP_STATUS.CONFLICT);

    const user = await User.create({
      fullName, phone, email, password,
      role: USER_ROLES.BUYER,
      profileSlug: buildSlug(fullName, phone),
    });

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON(), accessToken },
      'Buyer registered successfully',
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

const registerSimple = async (req, res, next) => {
  try {
    const { fullName, phone, email, shopName } = req.body;
    const role = req.path.includes('typist') ? USER_ROLES.TYPIST : USER_ROLES.STAMP_VENDOR;

    // ✅ UPDATED: deletedAt aur isActive check add kiya
    const exists = await User.findOne({ 
      phone, 
      deletedAt: null, 
      isActive: true 
    });
    
    if (exists) return ApiResponse.error(res, 'User already exists', HTTP_STATUS.CONFLICT);

    const user = await User.create({
      fullName, phone, email, role,
      bio: shopName ? `Shop: ${shopName}` : '',
      profileSlug: buildSlug(fullName, phone),
    });

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON(), accessToken },
      `${role} registered successfully`,
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   SESSION
   ===================================================== */

const refreshAccessToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return ApiResponse.error(res, 'No refresh token', HTTP_STATUS.UNAUTHORIZED);

    const { verifyRefreshToken, generateAccessToken } = require('../utils/generateToken');
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      return ApiResponse.error(res, 'Invalid session', HTTP_STATUS.UNAUTHORIZED);
    }

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    return ApiResponse.success(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    return ApiResponse.error(res, 'Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
  }
};

const logout = (req, res) => {
  res.clearCookie('refreshToken', { path: '/' });
  return ApiResponse.success(res, null, 'Logged out successfully');
};

const getMe = async (req, res) => {
  return ApiResponse.success(res, { user: req.user.toSafeJSON() }, 'Profile fetched');
};

const getProfileBySlug = async (req, res, next) => {
  try {
    const user = await User.findOne({ profileSlug: req.params.slug })
      .select('-password -kyc.panEncrypted -kyc.idNumberEncrypted');

    if (!user) {
      return ApiResponse.error(res, 'Profile not found', HTTP_STATUS.NOT_FOUND);
    }
    if (user.isBlocked || !user.isActive) {
      return ApiResponse.error(res, 'Profile not available', HTTP_STATUS.FORBIDDEN);
    }

    return ApiResponse.success(res, { user: user.toSafeJSON() }, 'Profile fetched');
  } catch (err) {
    next(err);
  }
};

// ==================== PASSWORD LOGIN ====================
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/userId/mobile and password',
      });
    }

    // User dhundho — email, userId, ya phone se
    const User = require('../models/User');
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { userId: identifier.toLowerCase().trim() },
        { phone: identifier.trim() },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Password compare karo
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check karo user active hai
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // Access Token generate karo
    const accessToken = user.generateAccessToken
      ? user.generateAccessToken()
      : require('jsonwebtoken').sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

    // Password response se hatao
    user.password = undefined;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==================== FORGOT PASSWORD ====================
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Security: chahe user mile ya na mile, same message bhejo
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, a reset link has been sent.',
      });
    }

    // Reset token generate karo
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // User model mein reset fields save karo
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Reset URL banao
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Email bhejo
    try {
      const { sendPasswordResetEmail } = require('../services/emailService');
      await sendPasswordResetEmail(user.email, user.fullName, resetUrl);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);

      // Agar email fail ho, toh token clear karo
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Reset link sent to your email',
    });
  } catch (err) {
    next(err);
  }
};

// ==================== RESET PASSWORD ====================
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be 8+ characters' });
    }

    // Hash the token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // User dhundho
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new link.',
      });
    }

    // Password set karo
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login.',
    });
  } catch (err) {
    next(err);
  }
};

// ==================== FORGOT USER ID ====================
const forgotUserId = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Security: same message chahe user mile ya na mile
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, your User ID has been sent.',
      });
    }

    // Email bhejo
    try {
      const { sendUserIdEmail } = require('../services/emailService');
      await sendUserIdEmail(user.email, user.fullName, user.userId);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User ID sent to your email',
    });
  } catch (err) {
    next(err);
  }
};

// ==================== GET PROFESSIONALS (PUBLIC) ====================
const getProfessionals = async (req, res, next) => {
  try {
    const { role, search, city, limit = 50, page = 1 } = req.query;

    // Public filter — login zaroori nahi
    const filter = {
      isActive: true,
      isBlocked: { $ne: true },
      deletedAt: null,
    };

    // Role filter
    if (role && role !== 'all') {
      filter.role = role;
    } else {
      filter.role = {
        $in: ['broker', 'advocate', 'typist', 'stamp_vendor', 'colonizer'],
      };
    }

    // Search filter
        // Search filter
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.pincode': { $regex: search, $options: 'i' } },       // 👈 ADD
        { shopPincode: { $regex: search, $options: 'i' } },              // 👈 ADD
        { shopAddress: { $regex: search, $options: 'i' } },              // 👈 ADD
        { shopLandmark: { $regex: search, $options: 'i' } },             // 👈 ADD
        { experience: { $regex: search, $options: 'i' } },               // 👈 ADD (optional)
      ];
    }

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [professionals, total] = await Promise.all([
      User.find(filter)
        .select(
          'fullName userId profileSlug profilePhoto role rating shopName location.city shopPincode phone whatsapp bio experience shopName shopAddress businessHours'
        )
        .sort({ 'rating.starRank': -1, 'rating.average': -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: professionals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==================== COMPLETE REGISTRATION (Step 4) ====================
const completeRegistration = async (req, res, next, isDirectRegistration = false) => {
  try {
    const body = req.body;

    const {
      email, otp, role,
      referralCode: clientReferralCode,
      professionalInfo = {},
      agencyName,
      experienceYears,
      reraNumber,
      barCouncilNumber,
      enrollmentYear,
      courtName,
      projectName,
      projectAddress,
      landmark,
    } = body;

    if (!email || !role) {
      return ApiResponse.error(res, 'Email and role are required', HTTP_STATUS.BAD_REQUEST);
    }

    // ✅ OTP DHUNDHO
    const Otp = require('../models/Otp');
    const otpDoc = await Otp.findOne({
      phone: `email:${email}`,
      purpose: 'registration',
      isUsed: false,
      verifiedAt: { $ne: null },
    });

    if (!otpDoc) {
      return ApiResponse.error(res, 'OTP not verified. Please verify again.', HTTP_STATUS.BAD_REQUEST);
    }

    const meta = otpDoc.meta || {};
    const { fullName, phone, userId, password, pincode, referralCode: metaReferralCode } = meta;
    const finalReferralCode = clientReferralCode || metaReferralCode;

    if (!fullName || !phone || !userId || !password) {
      return ApiResponse.error(res, 'Registration data missing', HTTP_STATUS.BAD_REQUEST);
    }

    // ✅ Duplicate check
       // ✅ Duplicate check — partial user auto-delete
    const existingUser = await User.findOne({
      deletedAt: null,
      isActive: true,
      $or: [
        { email: email.toLowerCase() },
        { phone },
        { userId: userId.toLowerCase() },
      ],
    });

    if (existingUser) {
      // 🔍 Check karo user COMPLETE hai ya PARTIAL
      let isComplete = true;

      if (existingUser.role === USER_ROLES.BROKER) {
        const broker = await Broker.findOne({ user: existingUser._id });
        if (!broker) isComplete = false;
      } else if (existingUser.role === USER_ROLES.ADVOCATE) {
        const advocate = await Advocate.findOne({ user: existingUser._id });
        if (!advocate) isComplete = false;
      } else if (existingUser.role === USER_ROLES.COLONIZER) {
        const colonizer = await Colonizer.findOne({ user: existingUser._id });
        if (!colonizer) isComplete = false;
      }

      if (!isComplete) {
        // 🗑️ Partial user hai — delete karo, aage badho
        console.log('🗑️ Auto-deleting partial user in completeRegistration:', existingUser.email);
        await User.findByIdAndDelete(existingUser._id);
      } else {
        // ✅ Complete user hai — login karne bolo
        return ApiResponse.error(res, 'User already exists. Please login.', HTTP_STATUS.CONFLICT);
      }
    }

    // 👇 User create karo — try-catch ke saath
    let user;
    try {
      user = await User.create({
        fullName,
        phone,
        email: email.toLowerCase(),
        userId: userId.toLowerCase(),
        password,
        role,
        profileSlug: buildSlug(fullName, phone),
        isEmailVerified: true,
        location: pincode ? { pincode } : undefined,
      });
    } catch (err) {
      console.error('❌ User.create FAILED:', err.message);
      return ApiResponse.error(res, 'User creation failed: ' + err.message, HTTP_STATUS.BAD_REQUEST);
    }

    // Referral track
    if (finalReferralCode) {
      try {
        await trackReferral(finalReferralCode, user._id, req.ip, req.headers['user-agent']);
      } catch (err) {
        console.error('Referral tracking failed:', err.message);
      }
    }

    // 👇 Role-specific data create karo — try-catch ke saath
    let roleData = null;
    try {
      if (role === USER_ROLES.BROKER) {
        roleData = await Broker.create({
          user: user._id,
          agencyName: agencyName || professionalInfo?.agencyName || '',
          experienceYears: experienceYears || professionalInfo?.experienceYears || '',
          reraNumber: reraNumber || professionalInfo?.reraNumber || '',
        });
      } else if (role === USER_ROLES.ADVOCATE) {
        roleData = await Advocate.create({
          user: user._id,
          barCouncilNumber: barCouncilNumber || professionalInfo?.barCouncilNumber || 'PENDING',
          enrollmentYear: enrollmentYear || professionalInfo?.enrollmentYear || '',
          courtName: courtName || professionalInfo?.courtName || '',
          services: ['legal_verification'],
        });
            } else if (role === USER_ROLES.COLONIZER) {
        roleData = await Colonizer.create({
          user: user._id,
          projectName: projectName || professionalInfo?.projectName || `${fullName}'s Project`,
          projectSlug: buildSlug(projectName || professionalInfo?.projectName || fullName, phone),
          projectAddress: projectAddress || professionalInfo?.projectAddress || '',
          landmark: landmark || professionalInfo?.landmark || '',
          contactNumber: phone,
        });
      } else if (role === USER_ROLES.RENT) {
        roleData = null;
      }
    } catch (err) {
      
      // ❌ ROLLBACK — user delete karo agar role data fail hua
      console.error('❌ Role data creation FAILED:', err.message, err.errors);
      await User.findByIdAndDelete(user._id);
      return ApiResponse.error(
        res,
        'Profile creation failed: ' + err.message,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 👇 YEH ADD KARO — Registration successfully complete mark karo
    user.isRegistrationComplete = true;
    await user.save();

    // OTP ko used mark karo
    otpDoc.isUsed = true;
    await otpDoc.save();

    sendWelcomeEmail(email, fullName, role).catch((err) => logger.error(err.message));

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON(), roleData, accessToken },
      'Registration successful!',
      HTTP_STATUS.CREATED
    );
  } catch (err) {
    next(err);
  }
};

/* =====================================================
   EXPORTS
   ===================================================== */

module.exports = {
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
};
