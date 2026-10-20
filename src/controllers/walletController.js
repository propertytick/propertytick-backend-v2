const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const AdminSettings = require('../models/AdminSettings');
const ApiResponse = require('../utils/apiResponse');
const { getWalletSummary, getOrCreateWallet } = require('../services/walletService');
const { HTTP_STATUS, POINT_PRICING, WALLET_TIER } = require('../config/constants');

/**
 * GET /api/v1/wallet/me
 */
const getMyWallet = async (req, res, next) => {
  try {
    if (!['broker', 'advocate', 'colonizer'].includes(req.user.role)) {
      return ApiResponse.error(res, 'Wallet only for broker, advocate and colonizer', HTTP_STATUS.FORBIDDEN);
    }

    await getOrCreateWallet(req.user._id, req.user.role);
    const summary = await getWalletSummary(req.user._id);

    return ApiResponse.success(res, { wallet: summary }, 'Wallet fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/wallet/transactions
 */
const getMyTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, transactions, page, limit, total, 'Transactions fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/wallet/packs
 * Get available packs based on current tier
 */
const getAvailablePacks = async (req, res, next) => {
  try {
    if (!['broker', 'advocate', 'colonizer'].includes(req.user.role)) {
      return ApiResponse.error(res, 'Wallet only for broker, advocate and colonizer', HTTP_STATUS.FORBIDDEN);
    }

    const settings = await AdminSettings.getGlobal();
    const wallet = await getOrCreateWallet(req.user._id, req.user.role);

    const packs = [];

        if (req.user.role === 'broker') {
      // ... broker packs (waise hi rahega)
      const freeLeft = Math.max(0, settings.fees.brokerWelcomeFree - wallet.freePointsUsed);
      if (freeLeft > 0) {
        packs.push({
          tier: WALLET_TIER.WELCOME,
          packSize: freeLeft,
          price: 0,
          label: `${freeLeft} FREE Deals remaining`,
          isFree: true,
        });
      }
      packs.push({
        tier: WALLET_TIER.GROWTH,
        packSize: settings.fees.brokerGrowthPackSize,
        price: settings.fees.brokerGrowthPackPrice,
        pricePerPoint: Math.round(settings.fees.brokerGrowthPackPrice / settings.fees.brokerGrowthPackSize),
        label: `Growth Pack — ${settings.fees.brokerGrowthPackSize} deals`,
      });
      packs.push({
        tier: WALLET_TIER.REGULAR,
        packSize: settings.fees.brokerRegularPackSize,
        price: settings.fees.brokerRegularPackPrice,
        pricePerPoint: Math.round(settings.fees.brokerRegularPackPrice / settings.fees.brokerRegularPackSize),
        label: `Regular Pack — ${settings.fees.brokerRegularPackSize} deals`,
      });
    } else if (req.user.role === 'advocate') {
      // ... advocate packs (waise hi rahega)
      const freeLeft = Math.max(0, settings.fees.advocateWelcomeFree - wallet.freePointsUsed);
      if (freeLeft > 0) {
        packs.push({
          tier: WALLET_TIER.WELCOME,
          packSize: freeLeft,
          price: 0,
          label: `${freeLeft} FREE Cases remaining`,
          isFree: true,
        });
      }
      packs.push({
        tier: WALLET_TIER.REGULAR,
        packSize: settings.fees.advocatePackSize,
        price: settings.fees.advocatePackPrice,
        pricePerPoint: Math.round(settings.fees.advocatePackPrice / settings.fees.advocatePackSize),
        label: `${settings.fees.advocatePackSize} Cases Pack (₹${Math.round(settings.fees.advocatePackPrice / settings.fees.advocatePackSize)}/case)`,
      });
    } else if (req.user.role === 'colonizer') {
      // 👇 COLONIZER KE LIYE NAYA SECTION
      // Colonizer ke liye NO FREE — sirf paid packs
      packs.push({
        tier: WALLET_TIER.REGULAR,
        packSize: settings.fees.colonizerAdPackSize || 1000,
        price: settings.fees.colonizerAdPackPrice || 1000,
        pricePerPoint: Math.round((settings.fees.colonizerAdPackPrice || 1000) / (settings.fees.colonizerAdPackSize || 1000)),
        label: `Advertisement Pack — ₹${settings.fees.colonizerAdPackPrice || 1000}`,
      });
      packs.push({
        tier: WALLET_TIER.GROWTH,
        packSize: settings.fees.colonizerGrowthPackSize || 5000,
        price: settings.fees.colonizerGrowthPackPrice || 5000,
        pricePerPoint: Math.round((settings.fees.colonizerGrowthPackPrice || 5000) / (settings.fees.colonizerGrowthPackSize || 5000)),
        label: `Premium Pack — ₹${settings.fees.colonizerGrowthPackPrice || 5000}`,
      });
    }

    return ApiResponse.success(res, { packs, currentTier: wallet.currentTier }, 'Packs fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyWallet,
  getMyTransactions,
  getAvailablePacks,
};
