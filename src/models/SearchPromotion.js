const mongoose = require('mongoose');

const searchPromotionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
    colonizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Colonizer' },

    entityType: { type: String, enum: ['user', 'property', 'colonizer'], required: true },
    entityRole: { type: String, enum: ['broker', 'advocate', 'colonizer', 'buyer', 'property'], required: true },

    // Paid details
    amountPaid: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, default: 30 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true, index: true },

    // Payment
    paymentGateway: { type: String, enum: ['razorpay', 'manual', 'admin'], default: 'razorpay' },
    paymentOrderId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    paymentStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },

    isActive: { type: Boolean, default: true, index: true },
    priorityBoost: { type: Number, default: 100 }, // how much boost in search

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

searchPromotionSchema.index({ endDate: 1, isActive: 1 });

module.exports = mongoose.model('SearchPromotion', searchPromotionSchema);
