const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // 👇 Purana field: Colonizer Reference
  colonizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Colonizer', required: true },
  
  title: { type: String, required: true, trim: true },
  projectType: { type: String, enum: ['residential', 'commercial', 'mixed', 'agriculture'], default: 'residential' },
  description: { type: String, default: '' },
  projectAddress: { type: String, default: '' },
  
  // 👇 Location: Ab ek single pincode nahi, multiple pincodes ka array hoga
  location: {
    city: { type: String, required: true },
    state: { type: String, default: '' },
    landmark: { type: String, default: '' },
  },
  
  // 👇 NAYA FIELD: 10 Pincode Targeting
  // User 10 pincodes daal sakta hai, jahan ad dikhana hai
  targetPincodes: { 
    type: [String], 
    validate: {
      validator: function(v) {
        return v.length <= 10; // Maximum 10 pincodes allowed
      },
      message: 'Aap maximum 10 pincodes hi daal sakte hain.'
    }
  },

  totalArea: { type: Number },
  totalPlots: { type: Number },
  priceRange: { type: String, default: '' },
  reraNumber: { 
    type: String, 
    required: [true, 'RERA Number is required'], 
    trim: true 
  },
  photos: [{ type: String }],
  naksha: [{ type: String }],
  contacts: [
    {
      name: { type: String },
      post: { type: String },
      phone: { type: String, match: /^[6-9]\d{9}$/ },
    },
  ],

  // 👇 NAYE FIELDS (Business Logic Ke Liye)
  
  // 1. Ad Type: Kaunsa section mein dikhega
  adType: { 
    type: String, 
    enum: ['premium_banner', 'paid_project', 'upcoming_project'], 
    required: true,
    default: 'upcoming_project' 
  },

  // 2. Payment Status
  isPaymentDone: { 
    type: Boolean, 
    default: false 
  },

  // 3. 3 Din Ka Free Trial (Sirf Upcoming Project ke liye)
  trialStartDate: { type: Date },
  trialEndDate: { type: Date },

  // 4. Status (Active, Expired, Pending Payment)
  status: { 
    type: String, 
    enum: ['active', 'expired', 'pending_payment'], 
    default: 'active' 
  },

}, { timestamps: true });

// 🔥 SABSE ZAROORI: Double Project Upload Rokne Ka Formula
// Agar same colonizer (ID) same title ke saath project daalega, toh Database error dega.
projectSchema.index({ colonizer: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('Project', projectSchema);