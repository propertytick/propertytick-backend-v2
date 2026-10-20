const Referral = require('../models/Referral');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');

// ===== REFERRAL REWARDS CONFIG =====
const REFERRAL_REWARDS = {
  broker: { type: 'point', perReferral: 0, threshold: 6, pointsPerThreshold: 1 },
  advocate: { type: 'point', perReferral: 0, threshold: 2, pointsPerThreshold: 1 },
  colonizer: { type: 'cash', perReferral: 100 },
  rent: { type: 'rentPoint', perReferral: 0, threshold: 2, pointsPerThreshold: 1 },  // 👈 NAYA
};

/**
 * GET /api/v1/referral/my-code
 * Get user's referral code
 */
const getMyReferralCode = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.referralCode) {
      // Generate if missing
      const base = (user.fullName || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'X');
      const random = Math.floor(1000 + Math.random() * 9000);
      user.referralCode = `${base}${random}`;
      await user.save();
    }
    
    return ApiResponse.success(res, {
      code: user.referralCode,
      link: `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`,
    }, 'Referral code fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/referral/my-stats
 * Get referral statistics
 */
const getMyReferralStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get all referrals
    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('referred', 'fullName phone profileSlug createdAt')
      .sort({ createdAt: -1 });
    
    const successful = referrals.filter(r => r.status === 'successful' || r.status === 'rewarded');
    const pending = referrals.filter(r => r.status === 'pending');
    
    // Calculate next reward progress
    const rewardConfig = REFERRAL_REWARDS[user.role];
    let nextReward = null;
    
        if (rewardConfig) {
      if (rewardConfig.type === 'point' || rewardConfig.type === 'rentPoint') {
        const currentCount = successful.length;
        const remainder = currentCount % rewardConfig.threshold;
        nextReward = {
          type: rewardConfig.type,
          threshold: rewardConfig.threshold,
          current: remainder,
          needed: rewardConfig.threshold - remainder,
          pointsPerThreshold: rewardConfig.pointsPerThreshold,
        };
      } else if (rewardConfig.type === 'cash') {
        nextReward = {
          type: 'cash',
          perReferral: rewardConfig.perReferral,
        };
      }
    }
    
    return ApiResponse.success(res, {
      totalReferrals: referrals.length,
      successfulReferrals: successful.length,
      pendingReferrals: pending.length,
      pointsEarned: user.referralPointsEarned,
      cashEarned: user.referralCashEarned,
      referralCode: user.referralCode,
      referralLink: `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`,
      nextReward,
      referrals,
    }, 'Referral stats fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/referral/track
 * Track referral when new user signs up (called from auth)
 */
const trackReferral = async (referrerCode, newUserId, ipAddress, userAgent) => {
  try {
    // Find referrer
    const referrer = await User.findOne({ referralCode: referrerCode });
    if (!referrer) return null;

    // Check roles allowed
    if (!['broker', 'advocate', 'colonizer', 'rent'].includes(referrer.role)) {
      return null;
    }

    // Check if already referred
    const existing = await Referral.findOne({ referred: newUserId });
    if (existing) return null;

    // Create referral record
    const referral = await Referral.create({
      referrer: referrer._id,
      referred: newUserId,
      referrerRole: referrer.role,
      status: 'successful',
      source: 'link',
      ipAddress,
      userAgent,
    });

    // Update referrer counts
    referrer.referralCount += 1;

    // Calculate reward
    const config = REFERRAL_REWARDS[referrer.role];

    // 👇 Point-based rewards (broker, advocate)
    if (config.type === 'point') {
      const newCount = referrer.referralCount;
      if (newCount % config.threshold === 0) {
        referrer.referralPointsEarned += config.pointsPerThreshold;

        const wallet = await Wallet.findOne({ user: referrer._id });
        if (wallet) {
          wallet.points += config.pointsPerThreshold;
          wallet.totalPurchased += config.pointsPerThreshold;
          await wallet.save();

          await Transaction.create({
            wallet: wallet._id,
            user: referrer._id,
            type: 'bonus',
            points: config.pointsPerThreshold,
            referenceType: 'admin',
            referenceId: referral._id,
            balanceAfter: wallet.points,
            description: `Referral bonus — ${config.threshold} successful referrals`,
            paymentGateway: 'none',
            paymentStatus: 'success',
          });
        }

        referral.status = 'rewarded';
        referral.rewardType = 'point';
        referral.rewardValue = config.pointsPerThreshold;
        referral.rewardedAt = new Date();
        await referral.save();

        await Notification.create({
          user: referrer._id,
          title: '🎉 Referral Bonus!',
          body: `You earned ${config.pointsPerThreshold} point${config.pointsPerThreshold > 1 ? 's' : ''} for ${config.threshold} successful referrals!`,
          type: 'payment',
        });
      }
    }
    // 👇 Rent point rewards (2 referrals = 1 rent point)
    else if (config.type === 'rentPoint') {
      if (!referrer.rentPoints) {
        referrer.rentPoints = {
          freeBalance: 3,
          paidBalance: 0,
          freeUsed: 0,
          totalPurchased: 0,
          totalUsed: 0,
          referralProgress: 0,
        };
      }

      referrer.rentPoints.referralProgress += 1;

      if (referrer.rentPoints.referralProgress >= config.threshold) {
        referrer.rentPoints.paidBalance += config.pointsPerThreshold;
        referrer.rentPoints.totalPurchased += config.pointsPerThreshold;
        referrer.rentPoints.referralProgress = 0;
        referrer.referralPointsEarned += config.pointsPerThreshold;

        referral.status = 'rewarded';
        referral.rewardType = 'rent_point';
        referral.rewardValue = config.pointsPerThreshold;
        referral.rewardedAt = new Date();
        await referral.save();

        await Notification.create({
          user: referrer._id,
          title: '🎉 Referral Bonus!',
          body: `You earned 1 Rent Point for 2 successful referrals! Total paid points: ${referrer.rentPoints.paidBalance}.`,
          type: 'payment',
        });
      }
    }
    // 👇 Cash rewards (colonizer)
    else if (config.type === 'cash') {
      referrer.referralCashEarned += config.perReferral;

      const wallet = await Wallet.findOne({ user: referrer._id });
      if (wallet) {
        wallet.points += config.perReferral;
        wallet.totalPurchasedAmount += config.perReferral;
        await wallet.save();

        await Transaction.create({
          wallet: wallet._id,
          user: referrer._id,
          type: 'bonus',
          points: config.perReferral,
          amount: config.perReferral,
          referenceType: 'admin',
          referenceId: referral._id,
          balanceAfter: wallet.points,
          description: `Referral bonus — ₹${config.perReferral}`,
          paymentGateway: 'none',
          paymentStatus: 'success',
        });
      }

      referral.status = 'rewarded';
      referral.rewardType = 'cash';
      referral.rewardValue = config.perReferral;
      referral.rewardedAt = new Date();
      await referral.save();

      await Notification.create({
        user: referrer._id,
        title: '💰 Referral Bonus!',
        body: `You earned ₹${config.perReferral} for a successful referral!`,
        type: 'payment',
      });
    }

    await referrer.save();

    return referral;
  } catch (err) {
    console.error('Track referral error:', err);
    return null;
  }
};

module.exports = {
  getMyReferralCode,
  getMyReferralStats,
  trackReferral,
  REFERRAL_REWARDS,
};
