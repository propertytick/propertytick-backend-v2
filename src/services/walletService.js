const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Broker = require('../models/Broker');
const Advocate = require('../models/Advocate');
const AdminSettings = require('../models/AdminSettings');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { WALLET_TIER, POINT_PRICING, HTTP_STATUS } = require('../config/constants');

/**
 * Get or create wallet for a user
 */
const getOrCreateWallet = async (userId, role) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    const settings = await AdminSettings.getGlobal();

    // 👇 Role-specific free limit
    let freeLimit = 0;
    if (role === 'broker') {
      freeLimit = settings.fees.brokerWelcomeFree || 3;
    } else if (role === 'advocate') {
      freeLimit = settings.fees.advocateWelcomeFree || 3;
    } else if (role === 'colonizer') {
      freeLimit = 0; // 👈 Colonizer ke liye NO FREE
    }

    wallet = await Wallet.create({
      user: userId,
      role,
      freePointsLimit: freeLimit,
      points: 0,
      currentTier: role === 'colonizer' ? WALLET_TIER.REGULAR : WALLET_TIER.WELCOME,
    });
  }
  return wallet;
};

/**
 * Consume a point for a successful deal/case
 */
const consumePoint = async (userId, referenceType, referenceId, description) => {
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    const error = new Error('Wallet not found');
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  let result;
  try {
    result = await wallet.consumePoint();
  } catch (err) {
    throw err;
  }

  await Transaction.create({
    wallet: wallet._id,
    user: userId,
    type: result.source === 'free' ? 'deduct_free' : 'deduct_paid',
    points: -1,
    referenceType,
    referenceId,
    balanceAfter: wallet.points,
    description: description || 'Point consumed',
    paymentGateway: 'none',
    paymentStatus: 'success',
  });

  await syncRoleWallet(userId, wallet);

  return result;
};

/**
 * Sync broker/advocate wallet mirror fields
 */
const syncRoleWallet = async (userId, wallet) => {
  const update = {
    'wallet.points': wallet.points,
    'wallet.freePointsUsed': wallet.freePointsUsed,
    'wallet.currentTier': wallet.currentTier,
  };

  await Promise.all([
    Broker.updateOne({ user: userId }, { $set: update }),
    Advocate.updateOne({ user: userId }, { $set: update }),
  ]);
};

/**
 * Purchase a pack (called after successful payment)
 */
const purchasePack = async (userId, role, packDetails) => {
  const { packSize, price, tier } = packDetails;

  const wallet = await getOrCreateWallet(userId, role);

  wallet.points += packSize;
  wallet.totalPurchased += packSize;
  wallet.totalPurchasedAmount += price;
  wallet.currentTier = tier;

  await wallet.save();

  const transaction = await Transaction.create({
    wallet: wallet._id,
    user: userId,
    type: 'purchase',
    points: packSize,
    amount: price,
    referenceType: 'pack_purchase',
    balanceAfter: wallet.points,
    description: `Purchased ${packSize} points for ₹${price} (${tier})`,
    paymentGateway: 'razorpay',
    paymentStatus: 'success',
  });

  await syncRoleWallet(userId, wallet);

  await Notification.create({
    user: userId,
    title: '✅ Points Purchased',
    body: `${packSize} points added to your wallet. Balance: ${wallet.points}`,
    type: 'payment',
  });

  return { wallet, transaction };
};

/**
 * Get wallet summary with next tier info
 */
const getWalletSummary = async (userId) => {
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) return null;

  const settings = await AdminSettings.getGlobal();

  // 👇 Role-specific free limit
  let freeLimit = 0;
  if (wallet.role === 'broker') {
    freeLimit = settings.fees.brokerWelcomeFree || 3;
  } else if (wallet.role === 'advocate') {
    freeLimit = settings.fees.advocateWelcomeFree || 3;
  } else if (wallet.role === 'colonizer') {
    freeLimit = 0; // 👈 Colonizer ke liye NO FREE
  }

  let nextTierInfo = null;

  if (wallet.role === 'broker') {
    if (wallet.freePointsUsed < freeLimit) {
      nextTierInfo = {
        tier: WALLET_TIER.WELCOME,
        freeLeft: freeLimit - wallet.freePointsUsed,
        message: 'Free points remaining',
      };
    } else if (wallet.currentTier === WALLET_TIER.WELCOME) {
      nextTierInfo = {
        tier: WALLET_TIER.GROWTH,
        packSize: settings.fees.brokerGrowthPackSize,
        price: settings.fees.brokerGrowthPackPrice,
      };
    } else {
      nextTierInfo = {
        tier: WALLET_TIER.REGULAR,
        packSize: settings.fees.brokerRegularPackSize,
        price: settings.fees.brokerRegularPackPrice,
      };
    }
  } else if (wallet.role === 'advocate') {
    if (wallet.freePointsUsed < freeLimit) {
      nextTierInfo = {
        tier: WALLET_TIER.WELCOME,
        freeLeft: freeLimit - wallet.freePointsUsed,
      };
    } else {
      nextTierInfo = {
        tier: WALLET_TIER.REGULAR,
        packSize: settings.fees.advocatePackSize,
        price: settings.fees.advocatePackPrice,
      };
    }
  } else if (wallet.role === 'colonizer') {
    // 👇 Colonizer — no free, only paid packs
    nextTierInfo = {
      tier: WALLET_TIER.REGULAR,
      packSize: settings.fees.colonizerAdPackSize || 1000,
      price: settings.fees.colonizerAdPackPrice || 1000,
      message: 'Purchase points for advertisements',
    };
  }

  return {
    points: wallet.points,
    freePointsUsed: wallet.freePointsUsed,
    freePointsLimit: wallet.freePointsLimit,
    freePointsLeft: Math.max(0, wallet.freePointsLimit - wallet.freePointsUsed),
    totalPurchased: wallet.totalPurchased,
    totalSpent: wallet.totalSpent,
    totalPurchasedAmount: wallet.totalPurchasedAmount,
    currentTier: wallet.currentTier,
    nextTierInfo,
  };
};

module.exports = {
  getOrCreateWallet,
  consumePoint,
  purchasePack,
  getWalletSummary,
  syncRoleWallet,
};
