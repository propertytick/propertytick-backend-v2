const User = require('../models/User');
const Broker = require('../models/Broker');
const Advocate = require('../models/Advocate');
const Colonizer = require('../models/Colonizer');
const AdminSettings = require('../models/AdminSettings');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { recalculateUserRank, recalculateColonizerRank } = require('../services/rankingService');
const { USER_ROLES, KYC_STATUS, HTTP_STATUS } = require('../config/constants');

/**
 * GET /api/v1/admin/dashboard
 * Overview stats
 */
const getDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalBuyers,
      totalBrokers,
      totalAdvocates,
      totalColonizers,
      totalTypists,
      totalStampVendors,
      blockedUsers,
      pendingKyc,
      verifiedKyc,
    ] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ role: USER_ROLES.BUYER, deletedAt: null }),
      User.countDocuments({ role: USER_ROLES.BROKER, deletedAt: null }),
      User.countDocuments({ role: USER_ROLES.ADVOCATE, deletedAt: null }),
      User.countDocuments({ role: USER_ROLES.COLONIZER, deletedAt: null }),
      User.countDocuments({ role: USER_ROLES.TYPIST, deletedAt: null }),
      User.countDocuments({ role: USER_ROLES.STAMP_VENDOR, deletedAt: null }),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ 'kyc.status': KYC_STATUS.PENDING }),
      User.countDocuments({ 'kyc.status': KYC_STATUS.VERIFIED }),
    ]);

    // Recent users (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: weekAgo },
      deletedAt: null,
    });

    return ApiResponse.success(res, {
      users: {
        total: totalUsers,
        buyers: totalBuyers,
        brokers: totalBrokers,
        advocates: totalAdvocates,
        colonizers: totalColonizers,
        typists: totalTypists,
        stampVendors: totalStampVendors,
        blocked: blockedUsers,
        newThisWeek: newUsersThisWeek,
      },
      kyc: {
        pending: pendingKyc,
        verified: verifiedKyc,
      },
    }, 'Dashboard stats fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/users
 * List all users with filters + pagination
 */
const listUsers = async (req, res, next) => {
  try {
    const { role, search, kycStatus, isBlocked, isActive, page, limit, sortBy, sortOrder } = req.query;

    const filter = { deletedAt: null };
    if (role) filter.role = role;
    if (kycStatus) filter['kyc.status'] = kycStatus;
    if (typeof isBlocked === 'boolean') filter.isBlocked = isBlocked;
    if (typeof isActive === 'boolean') filter.isActive = isActive;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { profileSlug: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -kyc.panEncrypted -kyc.idNumberEncrypted')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, users, page, limit, total, 'Users list fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/users/:id
 * Full user details with role-specific data
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);

    let roleData = null;
    if (user.role === USER_ROLES.BROKER) {
      roleData = await Broker.findOne({ user: user._id }).lean();
    } else if (user.role === USER_ROLES.ADVOCATE) {
      roleData = await Advocate.findOne({ user: user._id }).lean();
    } else if (user.role === USER_ROLES.COLONIZER) {
      roleData = await Colonizer.findOne({ user: user._id }).lean();
    }

    return ApiResponse.success(res, { user: user.toSafeJSON(), roleData }, 'User fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/block
 * Block or unblock a user
 */
const blockUser = async (req, res, next) => {
  try {
    const { isBlocked, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);

    if (user.role === USER_ROLES.ADMIN) {
      return ApiResponse.error(res, 'Cannot block admin', HTTP_STATUS.FORBIDDEN);
    }

    user.isBlocked = isBlocked;
    await user.save();

    // Notify user
    await Notification.create({
      user: user._id,
      title: isBlocked ? 'Account Blocked' : 'Account Unblocked',
      body: isBlocked
        ? `Your account has been blocked. Reason: ${reason || 'Violation of terms'}`
        : 'Your account has been unblocked. You can now use the platform.',
      type: isBlocked ? 'warning' : 'success',
    });

    return ApiResponse.success(
      res,
      { user: user.toSafeJSON() },
      isBlocked ? 'User blocked' : 'User unblocked'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/kyc
 * Approve or reject KYC
 */
const updateKyc = async (req, res, next) => {
  try {
    const { action, remarks } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);

    if (action === 'approve') {
      user.kyc.status = KYC_STATUS.VERIFIED;
      user.kyc.verifiedAt = new Date();
      user.kyc.remarks = remarks || 'Verified by admin';
    } else {
      user.kyc.status = KYC_STATUS.REJECTED;
      user.kyc.remarks = remarks || 'KYC rejected';
    }

    await user.save();

    await Notification.create({
      user: user._id,
      title: action === 'approve' ? '✅ KYC Approved' : '❌ KYC Rejected',
      body: action === 'approve'
        ? 'Your KYC has been verified. You can now access all features.'
        : `Your KYC was rejected. Reason: ${remarks || 'Documents unclear'}`,
      type: action === 'approve' ? 'success' : 'warning',
    });

    return ApiResponse.success(res, { user: user.toSafeJSON() }, `KYC ${action}d`);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/promote
 * Toggle paid promotion for top search ranking
 */
const togglePromotion = async (req, res, next) => {
  try {
    const { isPaid, paidUntil } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);

    user.promotion.isPaid = isPaid;
    user.promotion.paidUntil = isPaid ? (paidUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null;
    await user.save();

    // Recalculate priority
    await recalculateUserRank(user._id);

    return ApiResponse.success(res, { user: user.toSafeJSON() }, isPaid ? 'Promotion activated' : 'Promotion removed');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/fees
 * Get current fee settings
 */
const getFees = async (req, res, next) => {
  try {
    const settings = await AdminSettings.getGlobal();
    return ApiResponse.success(res, {
      fees: settings.fees,
      adPricing: settings.adPricing || {},
    }, 'Fees fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/fees
 * Update fee settings
 */
/**
 * PATCH /api/v1/admin/fees
 * Update fees/pricing for all roles
 */
const updateFees = async (req, res, next) => {
  try {
    const settings = await AdminSettings.getGlobal();

    const allowedFields = [
  // BROKER
  'brokerWelcomeFree',
  'brokerGrowthPackSize',
  'brokerGrowthPackPrice',
  'brokerRegularPackSize',
  'brokerRegularPackPrice',

  // ADVOCATE
  'advocateWelcomeFree',
  'advocatePackSize',
  'advocatePackPrice',

  // COLONIZER
  'colonizerAdPackSize',
  'colonizerAdPackPrice',
  'colonizerGrowthPackSize',
  'colonizerGrowthPackPrice',

  // TOP RANKING
  'topRankingBroker',
  'topRankingAdvocate',
  'topRankingColonizer',
  'topRankingBuyerProperty',

  // 👇 RENT PRICING — YEH ADD KARO
  'rentFreeLimit',
  'rentPerPropertyPrice',
  'rentStarterPackSize',
  'rentStarterPackPrice',
  'rentGrowthPackSize',
  'rentGrowthPackPrice',
];

    // Update fees
    allowedFields.forEach((key) => {
      if (req.body[key] !== undefined) {
        settings.fees[key] = Number(req.body[key]);
      }
    });

    // Update adPricing (Colonizer ads) 👈
    if (req.body.adPricing) {
      const adPricingFields = [
        'homepageBanner',
        'searchTop',
        'featuredBadge',
        'homepageSpotlight',
      ];
      if (!settings.adPricing) settings.adPricing = {};
      adPricingFields.forEach((key) => {
        if (req.body.adPricing[key] !== undefined) {
          settings.adPricing[key] = Number(req.body.adPricing[key]);
        }
      });
    }

    settings.updatedBy = req.user._id;
    await settings.save();

    return ApiResponse.success(res, { settings }, 'Fees updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/colonizers
 * List all colonizer projects
 */
const listColonizers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
        { projectAddress: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [colonizers, total] = await Promise.all([
      Colonizer.find(filter)
        .populate('user', 'fullName phone email profileSlug profilePhoto')
        .sort({ 'promotion.priorityScore': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Colonizer.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, colonizers, page, limit, total, 'Colonizers fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/colonizers/:id/promote
 */
const toggleColonizerPromotion = async (req, res, next) => {
  try {
    const { isPaid, paidUntil } = req.body;
    const colonizer = await Colonizer.findById(req.params.id);
    if (!colonizer) return ApiResponse.error(res, 'Colonizer not found', HTTP_STATUS.NOT_FOUND);

    colonizer.promotion.isPaid = isPaid;
    colonizer.promotion.paidUntil = isPaid ? (paidUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null;
    await colonizer.save();

    await recalculateColonizerRank(colonizer._id);

    return ApiResponse.success(res, { colonizer }, 'Colonizer promotion updated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/audit-logs
 */
const listAuditLogs = async (req, res, next) => {
  try {
    const { action, role, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (role) filter.role = role;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'fullName phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, logs, page, limit, total, 'Audit logs fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/recalculate-ranks
 * Recalculate all users' star ranks (maintenance)
 */
const recalculateAllRanks = async (req, res, next) => {
  try {
    const users = await User.find({ deletedAt: null }).select('_id');
    let count = 0;

    for (const u of users) {
      await recalculateUserRank(u._id);
      count++;
    }

    return ApiResponse.success(res, { recalculated: count }, `Recalculated ${count} user ranks`);
  } catch (err) {
    next(err);
  }
};
/**
 * DELETE /api/v1/admin/users/:id
 * Delete user (soft delete)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Khud ko delete nahi kar sakta
    if (String(id) === String(req.user._id)) {
      return ApiResponse.error(res, 'You cannot delete your own account', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findById(id);
    if (!user) {
      return ApiResponse.error(res, 'User not found', HTTP_STATUS.NOT_FOUND);
    }

    // Admin ko delete nahi kar sakta (safety)
    if (user.role === 'admin') {
      return ApiResponse.error(res, 'Cannot delete admin user', HTTP_STATUS.FORBIDDEN);
    }

    // Soft delete
    user.deletedAt = new Date();
    user.isActive = false;
    user.isBlocked = true;
    await user.save();

    return ApiResponse.success(res, null, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  listUsers,
  getUserById,
  blockUser,
  updateKyc,
  togglePromotion,
  getFees,
  updateFees,
  listColonizers,
  toggleColonizerPromotion,
  listAuditLogs,
  recalculateAllRanks,
   deleteUser,
};
