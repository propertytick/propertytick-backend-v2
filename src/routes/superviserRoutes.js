const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Superviser = require('../models/Superviser'); // Bada S sahi hai
const { sendEmail } = require('../utils/emailService');
const { createAndSendOtp, verifyOtp } = require('../utils/otpService'); 

// ==========================================
// 1. PUBLIC FORM: Become a Partner (Superviser)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, address, city, pinCode, marketingExperience } = req.body;

    const existing = await Superviser.findOne({ $or: [{ email }, { mobile }] });
    if (existing) return res.status(400).json({ message: "Email or Mobile already registered." });

    // Sirf naya function call karein (Demo mode check karega)
    await createAndSendOtp(mobile, 'registration');

    res.status(200).json({ message: "OTP sent to mobile. Please verify." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ==========================================
// 2. VERIFY OTP & SAVE DATA
// ==========================================
router.post('/verify-and-save', async (req, res) => {
  try {
    const { name, email, mobile, address, city, pinCode, marketingExperience, otp } = req.body;

    // Naya verify function call karein
    const otpDoc = await verifyOtp(mobile, otp, 'registration');
    
    if (!otpDoc) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const newSuperviser = new Superviser({
      name, email, mobile, address, city, pinCode, marketingExperience,
      status: 'Pending'
    });
    await newSuperviser.save();

    res.status(201).json({ message: "Registration successful. Admin will contact you soon." });
  } catch (error) {
    res.status(400).json({ message: error.message || "Invalid or expired OTP" });
  }
});

// ==========================================
// 3. KYC PAGE: Token Verify karna
// ==========================================
router.get('/kyc-verify-token', async (req, res) => {
  try {
    const { token } = req.query;
    const superviser = await Superviser.findOne({ 
      kycToken: token, 
      kycTokenExpiry: { $gt: Date.now() } 
    });

    if (!superviser) return res.status(400).json({ message: "Invalid or expired link." });

    res.status(200).json({ name: superviser.name, email: superviser.email });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================================
// 4. KYC SUBMIT
// ==========================================
router.post('/submit-kyc', async (req, res) => {
  try {
    const { token, panNumber, aadhaarNumber, bankAccountNumber, confirmAccount, ifscCode } = req.body;

    const superviser = await Superviser.findOne({ 
      kycToken: token, 
      kycTokenExpiry: { $gt: Date.now() } 
    });

    if (!superviser) return res.status(400).json({ message: "Invalid or expired link." });
    if (bankAccountNumber !== confirmAccount) return res.status(400).json({ message: "Bank accounts do not match." });

    const isBankValid = true; // Dummy verification
    if (!isBankValid) return res.status(400).json({ message: "Bank account verification failed." });

    superviser.panNumber = panNumber;
    superviser.aadhaarNumber = aadhaarNumber;
    superviser.bankAccountNumber = bankAccountNumber;
    superviser.ifscCode = ifscCode;
    superviser.isBankVerified = true;
    
    superviser.kycToken = undefined;
    superviser.kycTokenExpiry = undefined;
    superviser.status = 'Active'; 

    await superviser.save();
    res.status(200).json({ message: "KYC submitted successfully. Your account is now active." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;