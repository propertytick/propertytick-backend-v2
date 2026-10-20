const mongoose = require('mongoose');

const superviserSchema = new mongoose.Schema({
  // Basic Info (Form se aayega)
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  pinCode: { type: String, required: true },
  marketingExperience: { type: String },
  
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
  kycTokenExpiry: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Superviser', superviserSchema);