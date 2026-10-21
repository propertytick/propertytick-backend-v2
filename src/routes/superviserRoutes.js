const express = require('express');
const router = express.Router();
const Superviser = require('../models/Superviser'); 
const { createAndSendOtp, verifyOtp } = require('../services/otpService');
const { sendWelcomeEmail, sendViaBrevo } = require('../services/emailService'); // ✅ Sahi function import kiya

// ==========================================
// 1. PUBLIC FORM: Become a Partner (Superviser)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, address, city, pinCode, marketingExperience } = req.body;

    const existing = await Superviser.findOne({ $or: [{ email }, { mobile }] });
    if (existing) return res.status(400).json({ message: "Email or Mobile already registered." });

    // ✅ Mobile par Demo OTP (123456) bhej rahe hain
    await createAndSendOtp(mobile, 'registration', { 
      name, email, address, city, pinCode, marketingExperience 
    });

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

    // ✅ Mobile OTP verify kar rahe hain
    const otpDoc = await verifyOtp(mobile, otp, 'registration');
    
    if (!otpDoc) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Database mein save karein
    const newSuperviser = new Superviser({
      name, email, mobile, address, city, pinCode, marketingExperience,
      status: 'Pending'
    });
    await newSuperviser.save();

    // ✅ Aapko (Admin ko) Email notification bhejein
       // ✅ Aapko (Admin ko) Email notification bhejein
    try {
      // EmailService se sendViaBrevo import karein (agar pehle se nahi hai)
            
      const htmlMessage = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#ffffff;">
          <h1 style="color:#2563eb;">Welcome to PropertyTick! 🎉</h1>
          <p>Hi ${name},</p>
          <p>Thank you for applying to become a <strong>Superviser</strong> with PropertyTick.</p>
          <p>Our team will review your profile and contact you shortly for KYC and further steps.</p>
          <a href="${process.env.CLIENT_URL || 'https://www.propertytick.com'}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">Open Dashboard</a>
        </div>
      `;

      // 👇 Direct Brevo API se email bhej rahe hain
      await sendViaBrevo(
        'info.propertytick@gmail.com', 
        `New Superviser Registered: ${name}`, 
        htmlMessage, 
        `New Superviser Registered: ${name}`
      );
    } catch (emailError) {
      console.error("Admin notification email failed:", emailError.message);
    }

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