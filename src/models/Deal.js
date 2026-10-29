const mongoose = require('mongoose');

// ==================== PARTY SCHEMA (Seller & Buyer) ====================
const partySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
  aadhaarNumber: { type: String, trim: true, default: '' },
  aadhaarVerified: { type: Boolean, default: false },
  aadhaarVerifiedAt: { type: Date },
  photo: { type: String, default: '' },
  photoUploadedAt: { type: Date },
}, { _id: false });

// ==================== OTP VERIFICATION SCHEMA ====================
const otpVerificationSchema = new mongoose.Schema({
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  otpSentAt: { type: Date },
}, { _id: false });

// ==================== MAIN DEAL SCHEMA ====================
const dealSchema = new mongoose.Schema({
  // 1. Property & Broker Details
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  broker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // 2. Parties (Seller, Buyer, Dealer Photo)
  seller: { type: partySchema, required: true },
  buyer: { type: partySchema, required: true },
  brokerPhoto: { type: String, default: '' },
  
  // 3. Financials (Sai / Advance Section)
  totalAmount: { type: Number, required: true, min: 0 },
  advanceAmount: { type: Number, required: true, min: 0 },
  balanceAmount: { type: Number, required: true, min: 0 },
  
  // 4. Timeline
  agreementDate: { type: Date, required: true },
  expectedRegistryDate: { type: Date, required: true },
  finalRegistryDate: { type: Date },
  
  // 5. Documents (Max 20 files each) - CLEANED (No duplicates)
  agreementFiles: [{ type: String }], 
  registryFiles: [{ type: String }], 
  
  // 6. 3-Way OTP Verification
  otpVerification: {
    seller: { type: otpVerificationSchema, default: () => ({}) },
    buyer: { type: otpVerificationSchema, default: () => ({}) },
    broker: { type: otpVerificationSchema, default: () => ({}) },
  },
  
  // 7. Listing Source & Broker OTP Requirement
  listedBy: { type: String, enum: ['owner', 'broker'], default: 'owner' },
  brokerOtpRequired: { type: Boolean, default: true },
  
  // 8. Status Flow
  status: {
    type: String,
    enum: ['draft', 'agreement_verified', 'registry_completed', 'cancelled'],
    default: 'draft',
    index: true,
  },
  
  // 9. Edit History & Cancellation
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String, default: '' },
  cancelledAt: { type: Date },
  
}, { timestamps: true });

// ==================== VALIDATIONS & HOOKS ====================
dealSchema.pre('save', function(next) {
  if (this.totalAmount && this.advanceAmount) {
    this.balanceAmount = this.totalAmount - this.advanceAmount;
  }
  next();
});

dealSchema.path('agreementFiles').validate(function(value) {
  return value.length <= 20;
}, 'Maximum 20 files allowed for agreement documents');

dealSchema.path('registryFiles').validate(function(value) {
  return value.length <= 20;
}, 'Maximum 20 files allowed for registry documents');

// ==================== INDEXES ====================
dealSchema.index({ broker: 1, status: 1 });
dealSchema.index({ property: 1, status: 1 });
dealSchema.index({ 'seller.mobile': 1 });
dealSchema.index({ 'buyer.mobile': 1 });
dealSchema.index({ expectedRegistryDate: 1 });

// ==================== HELPER METHODS ====================
dealSchema.methods.isFullyVerified = function() {
  if (!this.brokerOtpRequired) {
    return this.otpVerification.seller.verified && this.otpVerification.buyer.verified;
  }
  return (
    this.otpVerification.seller.verified &&
    this.otpVerification.buyer.verified &&
    this.otpVerification.broker.verified
  );
};

dealSchema.methods.getNextOtpStep = function() {
  if (!this.otpVerification.seller.verified) return 'seller';
  if (!this.otpVerification.buyer.verified) return 'buyer';
  if (this.brokerOtpRequired && !this.otpVerification.broker.verified) return 'broker';
  return null; 
};

module.exports = mongoose.model('Deal', dealSchema);