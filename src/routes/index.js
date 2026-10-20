const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const propertyRoutes = require('./property.routes');
const walletRoutes = require('./wallet.routes');
const dealRoutes = require('./deal.routes');
const ratingRoutes = require('./rating.routes');
const colonizerRoutes = require('./colonizer.routes');
const toolsRoutes = require('./tools.routes');
const uploadRoutes = require('./upload.routes');
const referralRoutes = require('./referral.routes');
const userRoutes = require('./user.routes');
const rentRoutes = require('./rentRoutes');     
const nodemailer = require('nodemailer');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/properties', propertyRoutes);
router.use('/wallet', walletRoutes);
router.use('/deals', dealRoutes);
router.use('/ratings', ratingRoutes);
router.use('/colonizers', colonizerRoutes);
router.use('/tools', toolsRoutes);
router.use('/upload', uploadRoutes);
router.use('/referral', referralRoutes);
router.use('/users', userRoutes);
router.use('/rent', rentRoutes);    

// ==================== CONTACT FORM ====================
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"PropertyTick Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `New Contact: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});
// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PropertyTick API is healthy 🚀',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
  });
});

module.exports = router;
