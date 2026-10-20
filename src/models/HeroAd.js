const mongoose = require('mongoose');

const heroAdSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  price: { type: String, required: true },
  image: { type: String, required: true }, // Cloudinary URL
  tag: { type: String, default: 'Featured' },
  link: { type: String, default: '/search' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidUntil: { type: Date }, // If it's a paid ad
  fee: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('HeroAd', heroAdSchema);
