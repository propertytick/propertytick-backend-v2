const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  // 👇 Ad kis type ka hai (Project / Sell / Rent)
  adType: { 
    type: String, 
    enum: ['upcoming_project', 'sell_property', 'rent_property'], 
    required: true 
  },

  // 👇 Ad ka owner (Colonizer ya Broker/Dealer)
  colonizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // 👇 Project ya Property (dono mein se ek hi hoga)
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },   // Project ad ke liye
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' }, // Sell/Rent ad ke liye

  // 👇 Ad ka content
  image: { type: String, required: true },
  link: { type: String, required: true },
  pinCodes: [{ type: String }],

  // 👇 Discount (jaise "10% off on booking")
  discountText: { type: String, default: '' },

  // 👇 Admin ke set kiye gaye rates aur dates
  ratePerDay: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  totalAmount: { type: Number, default: 0 },

  // 👇 Ad ka status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'active', 'expired', 'rejected'], 
    default: 'pending' 
  },
  isActive: { type: Boolean, default: false },

  // 👇 I'm Interested wale users
  interestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
}, { timestamps: true });

module.exports = mongoose.model('Advertisement', advertisementSchema);