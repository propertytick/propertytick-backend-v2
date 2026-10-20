const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['broker', 'advocate', 'buyer', 'colonizer'], required: true },

    // Counters (auto-updated on OTP verification)
    successfulDeals: { type: Number, default: 0 },
    verifiedTitleChecks: { type: Number, default: 0 },
    deedsDrafted: { type: Number, default: 0 },
    completedTransactions: { type: Number, default: 0 }, // buyer

    // History
    history: [
      {
        type: { type: String }, // 'deal', 'title_check', 'deed', 'transaction'
        referenceId: { type: mongoose.Schema.Types.ObjectId },
        addedAt: { type: Date, default: Date.now },
        otpVerified: { type: Boolean, default: true },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

milestoneSchema.index({ user: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('Milestone', milestoneSchema);
