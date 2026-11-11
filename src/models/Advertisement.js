const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  colonizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  image: { type: String, required: true },
  link: { type: String, required: true },
  pinCodes: [{ type: String }],
  ratePerDay: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'active', 'expired', 'rejected'], default: 'pending' },
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Advertisement', advertisementSchema);