const mongoose = require('mongoose');
const { ADVOCATE_SERVICES, WALLET_TIER, POINT_PRICING } = require('../config/constants');

const advocateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Professional
    barCouncilNumber: { type: String, trim: true, required: true },
    enrollmentYear: { type: Number },
    courtName: { type: String, trim: true, default: '' },
    services: {
      type: [String],
      enum: Object.values(ADVOCATE_SERVICES),
      default: [ADVOCATE_SERVICES.LEGAL_VERIFICATION],
    },
    specializations: [{ type: String, trim: true }], // e.g., "Revenue Case", "Registry"

    // Wallet (flat ₹50 per case)
    wallet: {
      points: { type: Number, default: 0, min: 0 },
      freePointsUsed: { type: Number, default: 0 },
      totalPurchased: { type: Number, default: 0 },
      currentTier: { type: String, enum: Object.values(WALLET_TIER), default: WALLET_TIER.WELCOME },
    },

    // Milestones
    milestones: {
      verifiedTitleChecks: { type: Number, default: 0 },
      deedsDrafted: { type: Number, default: 0 },
      activeCases: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

advocateSchema.methods.getNextPackDetails = function () {
  const { ADVOCATE } = POINT_PRICING;
  if (this.wallet.freePointsUsed < ADVOCATE.WELCOME_FREE) {
    return { tier: WALLET_TIER.WELCOME, freeLeft: ADVOCATE.WELCOME_FREE - this.wallet.freePointsUsed };
  }
  return { tier: WALLET_TIER.REGULAR, packSize: ADVOCATE.PACK_SIZE, price: ADVOCATE.PACK_PRICE };
};

module.exports = mongoose.model('Advocate', advocateSchema);
