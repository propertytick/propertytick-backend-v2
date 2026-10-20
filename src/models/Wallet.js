const mongoose = require('mongoose');
const { WALLET_TIER } = require('../config/constants');

const walletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    role: { type: String, enum: ['broker', 'advocate', 'colonizer'], required: true },

    points: { type: Number, default: 0, min: 0 },
    freePointsUsed: { type: Number, default: 0 },
    freePointsLimit: { type: Number, default: 3 },
    totalPurchased: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalPurchasedAmount: { type: Number, default: 0 },

    currentTier: { type: String, enum: Object.values(WALLET_TIER), default: WALLET_TIER.WELCOME },

    // No expiry — koi time limit nahi
    hasExpiry: { type: Boolean, default: false },
  },
  { timestamps: true }
);

walletSchema.methods.consumePoint = async function () {
  if (this.freePointsUsed < this.freePointsLimit) {
    this.freePointsUsed += 1;
    await this.save();
    return { source: 'free', remainingFree: this.freePointsLimit - this.freePointsUsed };
  }

  if (this.points <= 0) {
    const error = new Error('Insufficient points. Please purchase a pack.');
    error.statusCode = 400;
    throw error;
  }

  this.points -= 1;
  this.totalSpent += 1;
  await this.save();
  return { source: 'paid', remaining: this.points };
};

module.exports = mongoose.model('Wallet', walletSchema);
