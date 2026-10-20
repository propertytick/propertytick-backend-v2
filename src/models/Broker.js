const mongoose = require('mongoose');
const { WALLET_TIER, POINT_PRICING } = require('../config/constants');

const brokerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Agency details
    agencyName: { type: String, trim: true, default: '' },
    experienceYears: { type: Number, default: 0, min: 0, max: 70 },
    operatingAreas: [{ type: String, trim: true }],
    reraNumber: { type: String, trim: true, default: '' },

    // Wallet
    wallet: {
      points: { type: Number, default: 0, min: 0 },
      freePointsUsed: { type: Number, default: 0 },
      totalPurchased: { type: Number, default: 0 },
      currentTier: { type: String, enum: Object.values(WALLET_TIER), default: WALLET_TIER.WELCOME },
    },

    // Milestones (OTP-verified)
    milestones: {
      successfulDeals: { type: Number, default: 0 },
      activeListings: { type: Number, default: 0 },
      closedDealsThisMonth: { type: Number, default: 0 },
    },

    // Track record
    trackRecord: [
      {
        property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
        closedAt: { type: Date },
        buyerName: { type: String, trim: true },
        otpVerified: { type: Boolean, default: false },
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

brokerSchema.methods.getNextPackDetails = function () {
  const { BROKER } = POINT_PRICING;
  if (this.wallet.freePointsUsed < BROKER.WELCOME_FREE) {
    return { tier: WALLET_TIER.WELCOME, freeLeft: BROKER.WELCOME_FREE - this.wallet.freePointsUsed };
  }
  if (this.wallet.currentTier === WALLET_TIER.WELCOME) {
    return { tier: WALLET_TIER.GROWTH, packSize: BROKER.GROWTH_PACK_SIZE, price: BROKER.GROWTH_PACK_PRICE };
  }
  return { tier: WALLET_TIER.REGULAR, packSize: BROKER.REGULAR_PACK_SIZE, price: BROKER.REGULAR_PACK_PRICE };
};

module.exports = mongoose.model('Broker', brokerSchema);
