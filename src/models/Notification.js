const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 100, trim: true }, // trim: true add kar diya
  body: { type: String, required: true, maxlength: 500, trim: true },  // trim: true add kar diya
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'deal', 'registration', 'kyc', 'payment', 'rating', 'system'], // ✅ PERFECT
    default: 'info',
  },
  isRead: { type: Boolean, default: false, index: true },
  link: { type: String, default: '' }, // 👈 'actionUrl' ki jagah 'link' kar diya (Controller ke saath match karne ke liye)
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// ✅ Ye index bahut achha hai, notifications fast load honge
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);