const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['login', 'registration', 'deal_close', 'bayana', 'advocate_service', 'password_reset'],
      required: true,
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    isUsed: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },   // 👈 YEH LINE ADD KARO
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

otpSchema.index({ phone: 1, purpose: 1 });

module.exports = mongoose.model('Otp', otpSchema);
