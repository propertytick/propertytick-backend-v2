const mongoose = require('mongoose');

const bayanaSchema = new mongoose.Schema(
  {
    // Digital bayana memo — legal token receipt
    memoNumber: { type: String, unique: true, required: true, index: true },

    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    broker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Terms
    tokenAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'cheque'], default: 'cash' },

    // Timeline
    agreementDate: { type: Date },
    registryDate: { type: Date },

    // Dual OTP verification
    buyerOtpVerified: { type: Boolean, default: false },
    buyerOtpVerifiedAt: { type: Date },
    sellerOtpVerified: { type: Boolean, default: false },
    sellerOtpVerifiedAt: { type: Date },

    // Status
    status: {
      type: String,
      enum: ['pending', 'buyer_verified', 'seller_verified', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Legal
    terms: { type: String, maxlength: 3000, default: '' },
    witnesses: [
      {
        name: { type: String, trim: true },
        phone: { type: String },
        _id: false,
      },
    ],

    // Generated PDF
    pdfUrl: { type: String, default: '' },

    // WhatsApp delivery
    whatsappSentToBuyer: { type: Boolean, default: false },
    whatsappSentToSeller: { type: Boolean, default: false },

    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bayana', bayanaSchema);
