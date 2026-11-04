const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  colonizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Colonizer', required: true },
  title: { type: String, required: true, trim: true },
  projectType: { type: String, enum: ['residential', 'commercial', 'mixed', 'agriculture'], default: 'residential' },
  description: { type: String, default: '' },
  projectAddress: { type: String, default: '' },
  location: {
    city: { type: String, required: true }, // City mandatory
    state: { type: String, default: '' },
    pincode: { 
      type: String, 
      required: [true, 'Pincode is required'], // Pincode mandatory
      match: [/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit Pincode'] 
    },
    landmark: { type: String, default: '' },
  },
  totalArea: { type: Number },
  totalPlots: { type: Number },
  priceRange: { type: String, default: '' },
  reraNumber: { 
    type: String, 
    required: [true, 'RERA Number is required'], // RERA mandatory
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
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);