const crypto = require('crypto');
const axios = require('axios');
const Otp = require('../models/Otp');
const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LENGTH = 6;

/**
 * Generate cryptographically secure OTP
 */
const generateOtp = () => {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
};

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

/**
 * Send OTP via MSG91 (India)
 */
const sendOtpSms = async (phone, otp) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`🧪 [DEV] OTP for ${phone}: ${otp}`);
    return { success: true, dev: true };
  }

  try {
    const url = 'https://control.msg91.com/api/v5/otp';
    const response = await axios.post(
      url,
      {
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: `91${phone}`,
        authkey: process.env.MSG91_AUTH_KEY,
        otp,
      },
      { timeout: 8000 }
    );

    if (response.data?.type === 'success') {
      return { success: true };
    }
    throw new Error(response.data?.message || 'MSG91 send failed');
  } catch (err) {
    logger.error(`OTP SMS failed for ${phone}: ${err.message}`);
    throw new Error('OTP send failed. Please try again.');
  }
};

/**
 * Create and send OTP
 */
const createAndSendOtp = async (phone, purpose = 'login', meta = {}) => {
  // Rate limit: max 5 OTPs per 15 min
  const recentCount = await Otp.countDocuments({
    phone,
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
  });
  if (recentCount >= 5) {
    const error = new Error('Too many OTP requests. Try again after 15 minutes.');
    error.statusCode = HTTP_STATUS.TOO_MANY;
    throw error;
  }

  // Invalidate previous unused OTPs for same phone+purpose
  await Otp.updateMany({ phone, purpose, isUsed: false }, { isUsed: true });

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await Otp.create({
    phone,
    otpHash,
    purpose,
    meta,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendOtpSms(phone, otp);

  return { success: true, expiresIn: OTP_TTL_MS / 1000 };
};

/**
 * Verify OTP — returns the OTP doc if valid
 */
const verifyOtp = async (phone, otp, purpose) => {
  const doc = await Otp.findOne({
    phone,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!doc) {
    const error = new Error('OTP expired or not found. Please request a new one.');
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  if (doc.attempts >= doc.maxAttempts) {
    doc.isUsed = true;
    await doc.save();
    const error = new Error('Maximum attempts exceeded. Request a new OTP.');
    error.statusCode = HTTP_STATUS.TOO_MANY;
    throw error;
  }

  const incomingHash = hashOtp(otp);
  if (incomingHash !== doc.otpHash) {
    doc.attempts += 1;
    await doc.save();
    const error = new Error(`Invalid OTP. ${doc.maxAttempts - doc.attempts} attempts left.`);
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  doc.isUsed = true;
  await doc.save();
  return doc;
};

module.exports = { generateOtp, createAndSendOtp, verifyOtp };
