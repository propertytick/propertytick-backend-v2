const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, KYC_STATUS } = require('../config/constants');

const socialLinksSchema = new mongoose.Schema(
  {
    facebook: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' },
    x: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    state: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    pincode: {
      type: String,
      match: /^[1-9][0-9]{5}$/,
    },
    landmark: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // ---- Identity ----
    fullName: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      unique: true,
      match: /^[6-9]\d{9}$/,
      index: true,
    },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    password: { type: String, minlength: 8, select: false },
    userId: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 4,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
      index: true,
    },

    // ---- Role & profile ----
    role: { type: String, enum: Object.values(USER_ROLES), required: true, index: true },
    profileSlug: { type: String, unique: true, sparse: true, lowercase: true, index: true },
    profilePhoto: { type: String, default: '' },
    shopPhotos: [{ type: String }],
    bio: { type: String, maxlength: 500, default: '' },

    // Business / Shop details
    shopName: { type: String, trim: true, maxlength: 150, default: '' },
    shopAddress: { type: String, trim: true, maxlength: 500, default: '' },
    shopLandmark: { type: String, trim: true, maxlength: 200, default: '' },
    shopPincode: { type: String, match: /^[1-9][0-9]{5}$/, sparse: true },
    shopCoordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    businessHours: { type: String, trim: true, maxlength: 100, default: '' },
    experience: { type: String, trim: true, maxlength: 100, default: '' },

    // ---- Contact & social ----
    whatsapp: { type: String, match: /^[6-9]\d{9}$/ },
    socialLinks: { type: socialLinksSchema, default: () => ({}) },
    location: { type: locationSchema, default: () => ({}) },
	    // ---- Agreement Details ----
    fatherName: { type: String, trim: true, maxlength: 100, default: '' },
    permanentAddress: { type: String, trim: true, maxlength: 500, default: '' },
    aadhaarLast4: { type: String, match: /^\d{4}$/ },   // last 4 digits only for security

    // ---- Verification ----
        // ---- Verification ----
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isRegistrationComplete: { type: Boolean, default: false },   // 👈 YEH LINE ADD KARO
    emailOtp: {
      code: { type: String, select: false },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
    },
    // ---- Password Reset ----
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    kyc: {
      status: { type: String, enum: Object.values(KYC_STATUS), default: KYC_STATUS.PENDING },
      panEncrypted: { type: String, select: false },
      idType: { type: String, enum: ['aadhaar', 'voter', 'dl', 'passport'], default: 'aadhaar' },
      idNumberEncrypted: { type: String, select: false },
      verifiedAt: { type: Date },
      remarks: { type: String, default: '' },
    },

    // ---- Ratings ----
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
      starRank: { type: Number, default: 0 },
    },
	
		rentPoints: {
  freeBalance: { type: Number, default: 3 },      // 3 free points milte hain signup par
  paidBalance: { type: Number, default: 0 },      // recharge se aaye points
  freeUsed: { type: Number, default: 0 },         // kitne free use ho gaye
  totalPurchased: { type: Number, default: 0 },   // total purchased (paid)
  totalUsed: { type: Number, default: 0 },        // total used (free + paid)
  referralProgress: { type: Number, default: 0 }, // kitne referrals count hue (2 par 1 point)
},

    // ---- Paid promotion ----
    promotion: {
      isPaid: { type: Boolean, default: false },
      paidUntil: { type: Date },
      priorityScore: { type: Number, default: 0, index: true },
    },

    // 👇 ===== REFERRAL SYSTEM (YAHAN ADD KARO) =====
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralCount: { type: Number, default: 0 },
    referralPointsEarned: { type: Number, default: 0 },
    referralCashEarned: { type: Number, default: 0 },

    // ---- Status ----
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// 2dsphere index
userSchema.index({ 'location.coordinates': '2dsphere' });

// ---- Hooks ----
userSchema.pre('save', async function (next) {
  // Auto-generate referral code
  if (!this.referralCode) {
    const base = (this.fullName || 'USER')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4)
      .padEnd(4, 'X');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.referralCode = `${base}${random}`;
  }

  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ---- Methods ----
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.kyc?.panEncrypted;
  delete obj.kyc?.idNumberEncrypted;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
