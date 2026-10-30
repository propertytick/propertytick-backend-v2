const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 100, trim: true },
  body: { type: String, required: true, maxlength: 500, trim: true },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'deal', 'registration', 'kyc', 'payment', 'rating', 'system', 'interest'], // ✅ 'interest' ADD KAR DIYA
    default: 'info',
  },
  isRead: { type: Boolean, default: false, index: true },
  link: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);