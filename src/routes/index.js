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

const newsletterRoutes = require('./newsletter.routes');
router.use('/newsletter', newsletterRoutes);

const projectRoutes = require('./project.routes'); 






// ✅ sendContactMessage import karein
const { sendContactMessage } = require('../controllers/authController');

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
router.use('/projects', projectRoutes);

// ==================== CONTACT FORM ====================
// ✅ Sirf yeh ek line rakhein (nodemailer wala poora code hata dein)
router.post('/contact', sendContactMessage);

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