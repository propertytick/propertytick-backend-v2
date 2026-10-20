const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referred: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    
    // Referrer ka role
    referrerRole: {
      type: String,
      enum: ['broker', 'advocate', 'colonizer'],
      required: true,
    },
    
    // Referral status
    status: {
      type: String,
      enum: ['pending', 'successful', 'rewarded'],
      default: 'pending',
    },
    
    // Kab reward mila
    rewardedAt: { type: Date },
    rewardType: { type: String, enum: ['point', 'cash', 'none'] },
    rewardValue: { type: Number, default: 0 },
    
    // Referral source
    source: { type: String, enum: ['link', 'whatsapp', 'app'], default: 'link' },
    
    // Metadata
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

referralSchema.index({ referrer: 1, status: 1 });

module.exports = mongoose.model('Referral', referralSchema);
