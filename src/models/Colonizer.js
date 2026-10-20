const mongoose = require('mongoose');

const colonizerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    projectName: { type: String, required: true, trim: true, maxlength: 120 },
    projectSlug: { type: String, unique: true, sparse: true, lowercase: true, index: true },
    description: { type: String, maxlength: 2000, default: '' },

    // Layout & media
    layoutMap: { type: String, default: '' }, // Cloudinary URL
    photos: [{ type: String }],
    videos: [{ type: String }],

    // Location (inherited from User too, but project-specific)
    projectAddress: { type: String, trim: true, default: '' },
    pincode: { type: String, match: /^[1-9][0-9]{5}$/ },
    landmark: { type: String, trim: true, default: '' },

    // Contact
    contactNumber: { type: String, match: /^[6-9]\d{9}$/, required: true },

    // Agents under this colonizer
    agents: [
      {
        name: { type: String, trim: true, required: true },
        mobile: { type: String, match: /^[6-9]\d{9}$/, required: true },
        _id: false,
      },
    ],

    // Ratings & promotion
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
      starRank: { type: Number, default: 0 },
    },
    promotion: {
      isPaid: { type: Boolean, default: false },
      paidUntil: { type: Date },
      priorityScore: { type: Number, default: 0, index: true },
    },

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Colonizer', colonizerSchema);
