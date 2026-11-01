const mongoose = require('mongoose');

const superviserSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  city: { type: String },
  
  // Profession
  profession: {
    type: String,
    enum: ['broker', 'advocate', 'colonizer', 'typist', 'stamp_vendor', 'other'],
    required: true,
  },
  
  // KYC Info (Link se aayega)
  panNumber: { type: String },
  aadhaarNumber: { type: String },
  bankAccountNumber: { type: String },
  ifscCode: { type: String },
  
  // Verification Status
  isBankVerified: { type: Boolean, default: false },
  isAadhaarVerified: { type: Boolean, default: false },
  
  // Admin Workflow
  status: { 
    type: String, 
    enum: ['Pending', 'KYC_Sent', 'Active', 'Rejected'], 
    default: 'Pending' 
  },
  role: { type: String, default: 'SUPERVISER' },

  // KYC Link Token (5 din ke liye)
  kycToken: { type: String },
  kycTokenExpiry: { type: Date },
  
  // ✅ Extra fields jo admin panel ke liye zaroori hain
  isRegistered: { type: Boolean, default: false },        // User already registered hai ya nahi
  registeredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Agar registered hai toh User ID
  registeredRole: { type: String },                      // User ka role (broker, buyer, etc.)
  
}, { timestamps: true });

module.exports = mongoose.model('Superviser', superviserSchema);