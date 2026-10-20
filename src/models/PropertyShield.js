const mongoose = require('mongoose');

const propertyShieldSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    khasraNumber: { type: String, required: true, trim: true, index: true },
    district: { type: String, trim: true, default: '' },
    tehsil: { type: String, trim: true, default: '' },
    village: { type: String, trim: true, default: '' },

    // Verification
    ownershipDocumentUrl: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Lock status — prevents others from listing this khasra
    isLocked: { type: Boolean, default: true },
    lockedAt: { type: Date, default: Date.now },

    // Contact (for out-of-town owners)
    contactPhone: { type: String, match: /^[6-9]\d{9}$/ },
    contactEmail: { type: String, trim: true, lowercase: true, default: '' },

    notes: { type: String, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

propertyShieldSchema.index({ khasraNumber: 1, district: 1, tehsil: 1, village: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('PropertyShield', propertyShieldSchema);
