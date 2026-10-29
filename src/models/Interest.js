const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  // 👇 YE DONO FIELDS HAIN (Ek waqt mein ya toh property hogi ya colonizer)
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' }, 
  colonizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Colonizer' }, 
  
  // 👇 OWNER FIELD ADD KIYA (Zaroori hai index aur controller ke liye)
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // Interested user ki details
  interestedUser: {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    email: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^[1-9][0-9]{5}$/ }
  },
  
  message: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  isRead: { type: Boolean, default: false, index: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // Project name ya property title save karne ke liye
}, { timestamps: true });

// Fast fetching ke liye index
interestSchema.index({ owner: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Interest', interestSchema);