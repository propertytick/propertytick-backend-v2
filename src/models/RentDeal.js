const mongoose = require('mongoose');

// ==================== PARTY SCHEMA (Tenant & Owner) ====================
const partySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
  aadhaarNumber: { type: String, trim: true, default: '' },
  aadhaarVerified: { type: Boolean, default: false },
  aadhaarVerifiedAt: { type: Date },
  photo: { type: String, default: '' }, // Cloudinary URL (Live Camera)
  photoUploadedAt: { type: Date },
}, { _id: false });

// ==================== OTP VERIFICATION SCHEMA ====================
const otpVerificationSchema = new mongoose.Schema({
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  otpSentAt: { type: Date },
  isRequired: { type: Boolean, default: true }, // Broker ke liye conditional
}, { _id: false });

// ==================== MAIN RENT DEAL SCHEMA ====================
const rentDealSchema = new mongoose.Schema({
  
  // 1. Property & Parties
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenant: { type: partySchema, required: true }, // Embedded (may not be registered user)
  broker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional
  
  // 2. Broker Photo (Always required if broker is involved)
  brokerPhoto: { type: String, default: '' },
  
  // 3. Rent Details
  monthlyRent: { type: Number, required: true, min: 0 },
  securityDeposit: { type: Number, default: 0, min: 0 },
  maintenanceCharges: { type: Number, default: 0, min: 0 },
  
  // 4. Timeline
  agreementStartDate: { type: Date, required: true },
  agreementEndDate: { type: Date, required: true }, // Jab agreement khatm hoga
  noticePeriod: { type: Number, default: 1, min: 0 }, // Months
  
  // 5. Agreement Documents (Max 10 files - Kirayanama)
  agreementFiles: [{ type: String }], // JPG/PDF URLs
  
  // 6. 3-Way OTP Verification
  otpVerification: {
    tenant: { type: otpVerificationSchema, default: () => ({}) },
    owner: { type: otpVerificationSchema, default: () => ({}) },
    broker: { type: otpVerificationSchema, default: () => ({ isRequired: false }) }, // Conditional
  },
  
  // 7. Property Listing Source (To determine if broker OTP is required)
  listedBy: {
    type: String,
    enum: ['owner', 'broker'],
    required: true,
    default: 'owner',
  },
  
  // 8. Status Flow
  status: {
    type: String,
    enum: ['draft', 'agreement_verified', 'completed', 'cancelled', 'expired'],
    default: 'draft',
    index: true,
  },
  
  // 9. Edit History & Cancellation
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String, default: '' },
  cancelledAt: { type: Date },
  
  // 10. Completion
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
}, { timestamps: true });

// ==================== VALIDATIONS & HOOKS ====================

// Auto-calculate notice period end date helper
rentDealSchema.pre('save', function(next) {
  if (this.agreementStartDate && this.agreementEndDate) {
    if (this.agreementEndDate <= this.agreementStartDate) {
      throw new Error('Agreement end date must be after start date');
    }
  }
  next();
});

// Max 10 files validation for agreement
rentDealSchema.path('agreementFiles').validate(function(value) {
  return value.length <= 10;
}, 'Maximum 10 files allowed for rent agreement documents');

// ==================== INDEXES ====================
rentDealSchema.index({ owner: 1, status: 1 });
rentDealSchema.index({ 'tenant.mobile': 1 });
rentDealSchema.index({ broker: 1, status: 1 });
rentDealSchema.index({ agreementEndDate: 1 });

// ==================== HELPER METHODS ====================

// Check if all required OTPs are verified
rentDealSchema.methods.isFullyVerified = function() {
  const tenantVerified = this.otpVerification.tenant.verified;
  const ownerVerified = this.otpVerification.owner.verified;
  const brokerVerified = this.otpVerification.broker.verified;
  const brokerRequired = this.otpVerification.broker.isRequired;
  
  if (brokerRequired) {
    return tenantVerified && ownerVerified && brokerVerified;
  }
  return tenantVerified && ownerVerified;
};

// Get next OTP step (Sequential: Tenant -> Owner -> Broker)
rentDealSchema.methods.getNextOtpStep = function() {
  if (!this.otpVerification.tenant.verified) return 'tenant';
  if (!this.otpVerification.owner.verified) return 'owner';
  if (this.otpVerification.broker.isRequired && !this.otpVerification.broker.verified) {
    return 'broker';
  }
  return null; // All required OTPs verified
};

// Check if broker OTP is required
rentDealSchema.methods.isBrokerOtpRequired = function() {
  // If property listed by broker, broker OTP is required
  // If property listed by owner, broker OTP is optional
  return this.listedBy === 'broker';
};

// ==================== EXPORT ====================
module.exports = mongoose.model('RentDeal', rentDealSchema);