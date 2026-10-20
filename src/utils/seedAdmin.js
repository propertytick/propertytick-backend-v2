const User = require('../models/User');
const AdminSettings = require('../models/AdminSettings');
const logger = require('./logger');
const { USER_ROLES } = require('../config/constants');

const seedAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const phone = process.env.ADMIN_PHONE;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !phone || !password) {
      logger.warn('⚠️ Admin seed skipped — env vars missing');
      return;
    }

    const existing = await User.findOne({ role: USER_ROLES.ADMIN });
    if (existing) {
      logger.info('✅ Admin already exists');
    } else {
      await User.create({
        fullName: 'Super Admin',
        phone,
        email,
        password,
        role: USER_ROLES.ADMIN,
        isPhoneVerified: true,
        isEmailVerified: true,
        profileSlug: 'admin-bhoomi',
      });
      logger.info('✅ Admin seeded successfully');
    }

    // Ensure global settings exist
    await AdminSettings.getGlobal();
    logger.info('✅ Admin settings initialized');
  } catch (err) {
    logger.error(`Admin seed failed: ${err.message}`);
  }
};

module.exports = { seedAdmin };
