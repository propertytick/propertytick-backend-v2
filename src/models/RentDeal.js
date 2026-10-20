const mongoose = require('mongoose');

const witnessSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  fatherName: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  phone: { type: String, match: /^[6-9]\d{9}$/ },
}, { _id: false });

const rentDealSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'owner_verified', 'tenant_verified', 'completed', 'cancelled'],
      default: 'pending',
    },
    ownerOtp: { type: String, select: false },
    tenantOtp: { type: String, select: false },
    ownerOtpExpiresAt: { type: Date, select: false },
    tenantOtpExpiresAt: { type: Date, select: false },
    ownerOtpAttempts: { type: Number, default: 0 },
    tenantOtpAttempts: { type: Number, default: 0 },
    ownerVerifiedAt: { type: Date },
    tenantVerifiedAt: { type: Date },

    // Agreement
    agreementUrl: { type: String },
    agreementNumber: { type: String, unique: true, sparse: true },
    agreementGeneratedAt: { type: Date },

    // Terms
    rentAmount: { type: Number, required: true },
    depositAmount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    duration: { type: Number, default: 11 },
    maintenanceCharges: { type: Number, default: 0 },
    noticePeriod: { type: Number, default: 1 },

    // 👇 WITNESSES — DONO TARAF SE 1-1
    ownerWitness: { type: witnessSchema, default: null },
    tenantWitness: { type: witnessSchema, default: null },

    // Point deduction
    pointDeducted: { type: Boolean, default: false },
    pointDeductedFrom: { type: String, enum: ['owner', 'tenant', 'none'], default: 'none' },
    pointDeductedAt: { type: Date },

    // Cancellation
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String, default: '' },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

rentDealSchema.index({ property: 1, status: 1 });
rentDealSchema.index({ owner: 1, status: 1 });
rentDealSchema.index({ tenant: 1, status: 1 });

module.exports = mongoose.model('RentDeal', rentDealSchema);
