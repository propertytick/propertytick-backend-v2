const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: ['purchase', 'deduct_free', 'deduct_paid', 'refund', 'bonus', 'admin_adjust'],
      required: true,
    },

    points: { type: Number, required: true }, // + for credit, - for debit
    amount: { type: Number, default: 0 }, // ₹ amount

    // Context
    referenceType: { type: String, enum: ['deal', 'advocate_case', 'pack_purchase', 'admin'], default: 'deal' },
    referenceId: { type: mongoose.Schema.Types.ObjectId },

    balanceAfter: { type: Number, default: 0 },

    // Payment gateway
    paymentGateway: { type: String, enum: ['razorpay', 'manual', 'admin', 'none'], default: 'none' },
    paymentOrderId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    paymentStatus: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'success' },

    description: { type: String, maxlength: 500, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
