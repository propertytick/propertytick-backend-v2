const mongoose = require('mongoose');
const { RATING_TYPE } = require('../config/constants');

const ratingSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    ratingType: { type: String, enum: Object.values(RATING_TYPE), required: true },

    stars: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, maxlength: 1000, default: '' },

    // Context
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },

    // Moderation
    isVisible: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    flaggedReason: { type: String, default: '' },

    // Admin
    adminRemarks: { type: String, default: '' },
  },
  { timestamps: true }
);

// Ek user dusre user ko ek deal me ek hi baar rating de sakta hai
ratingSchema.index({ fromUser: 1, toUser: 1, deal: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Rating', ratingSchema);
