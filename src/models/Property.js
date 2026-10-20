const mongoose = require('mongoose');
const { PROPERTY_STATUS, LAND_UNITS } = require('../config/constants');

const propertySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    listedByRole: { type: String, enum: ['buyer', 'broker', 'colonizer', 'advocate'], default: 'buyer' },

    // Basic info
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 3000, default: '' },
    propertyType: {
      type: String,
      enum: ['plot', 'land', 'house', 'flat', 'shop', 'agriculture', 'commercial', 'industrial'],
      required: true,
    },

    // Listing Purpose: buy / rent / lease / exchange
    listingPurpose: {
      type: String,
      enum: ['buy', 'rent', 'lease', 'exchange'],
      required: true,
      default: 'buy',
      index: true,
    },

    status: { type: String, enum: Object.values(PROPERTY_STATUS), default: PROPERTY_STATUS.ACTIVE, index: true },

    // Land measurement
    area: {
      value: { type: Number, required: true, min: 0 },
      unit: { type: String, enum: Object.values(LAND_UNITS), required: true },
      sqftConverted: { type: Number, default: 0 },
    },

    // Pricing
    price: {
      amount: { type: Number, required: true, min: 0 },
      isNegotiable: { type: Boolean, default: false },
      pricePerSqft: { type: Number, default: 0 },
    },

    // Location
    location: {
      state: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      tehsil: { type: String, trim: true, default: '' },
      village: { type: String, trim: true, default: '' },
      pincode: { type: String, match: /^[1-9][0-9]{5}$/ },
      landmark: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
    },

    // Media
    photos: [{ type: String }],
    videoTour: { type: String, default: '' },

    // GPS boundary — array of 4 corners
    gpsBoundary: [
      {
        lat: { type: Number },
        lng: { type: Number },
        _id: false,
      },
    ],

    // Documents
    khasraNumber: { type: String, trim: true, default: '', index: true },
    documents: [{ type: String }],

    // Barter/Exchange
    exchangeAvailable: { type: Boolean, default: false },
    exchangeWanted: { type: String, maxlength: 500, default: '' },

    // Property Shield — for out-of-town owners
    propertyShield: {
      isLocked: { type: Boolean, default: false },
      lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      lockedAt: { type: Date },
    },

    // Promotion
    promotion: {
      isPaid: { type: Boolean, default: false },
      paidUntil: { type: Date },
      priorityScore: { type: Number, default: 0, index: true },
    },

    // Stats
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },

    // Deal
    soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    soldAt: { type: Date },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

propertySchema.index({ 'location.coordinates': '2dsphere' });
propertySchema.index({ 'location.city': 1, propertyType: 1, status: 1 });
propertySchema.index({ title: 'text', description: 'text', 'location.landmark': 'text' });

module.exports = mongoose.model('Property', propertySchema);
