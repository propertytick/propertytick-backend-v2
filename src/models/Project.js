const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  colonizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Colonizer', required: true },
  title: { type: String, required: true },
  description: { type: String },
  location: { type: String },
  price: { type: Number },
  photos: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);