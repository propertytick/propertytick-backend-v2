const mongoose = require('mongoose');
const { DEAL_STATUS } = require('../config/constants');

const witnessSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  fatherName: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  phone: { type: String, match: /^[6-9]\d{9}$/ },
}, { _id: false });

const dealSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    broker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    buyerOtp: {
      isVerified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
    },
    ownerOtp: {
      isVerified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
    },

    finalAmount: { type: Number, min: 0 },
    tokenAmount: { type: Number, min: 0 },
    commissionPercent: { type: Number, default: 0 },

    status: { type: String, enum: Object.values(DEAL_STATUS), default: DEAL_STATUS.INITIATED, index: true },

    // Agreement
    agreementUrl: { type: String },
    agreementNumber: { type: String, unique: true, sparse: true },
    agreementGeneratedAt: { type: Date },

    // 👇 WITNESSES — DONO TARAF SE 1-1
    sellerWitness: { type: witnessSchema, default: null },
    buyerWitness: { type: witnessSchema, default: null },

    pointDeducted: { type: Boolean, default: false },
    pointDeductedAt: { type: Date },
    milestoneUpdated: { type: Boolean, default: false },
    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String, maxlength: 1000, default: '' },
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String, default: '' },
  },
  { timestamps: true }
);

dealSchema.index({ broker: 1, status: 1 });

module.exports = mongoose.model('Deal', dealSchema);
