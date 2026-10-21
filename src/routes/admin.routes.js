const express = require('express');
const router = express.Router();

const {
  getDashboard,
  listUsers,
  getUserById,
  blockUser,
  updateKyc,
  togglePromotion,
  getFees,
  updateFees,
  listColonizers,
  toggleColonizerPromotion,
  listAuditLogs,
  recalculateAllRanks,
  deleteUser,                  // 👈 ADD
} = require('../controllers/adminController');

const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const { adminOnly } = require('../middlewares/roleCheck');
const audit = require('../middlewares/auditLogger');
const {
  listUsersQuerySchema,
  updateFeesSchema,
  kycActionSchema,
  blockUserSchema,
  promoteUserSchema,
} = require('../validators/adminValidator');

const crypto = require('crypto');

const { sendEmail } = require('../utils/emailService');

// Admin: Approve & Send KYC Link
router.post('/superviser/send-kyc-link/:id', async (req, res) => {
  try {
    const superviser = await Superviser.findById(req.params.id);
    if (!superviser) return res.status(404).json({ message: "Superviser not found" });

    // Token banayein (5 Din ke liye)
    const token = crypto.randomBytes(32).toString('hex');
    superviser.kycToken = token;
    superviser.kycTokenExpiry = Date.now() + 5 * 24 * 60 * 60 * 1000; // 5 Days
    superviser.status = 'KYC_Sent';
    await superviser.save();

    // Link Email par bhejein
    const kycLink = `https://www.propertytick.com/superviser-kyc?token=${token}`;
    await sendEmail(
      superviser.email,
      "Complete your Superviser KYC - PropertyTick",
      `<h1>Hello ${superviser.name}</h1>
       <p>Aapko Superviser appoint kiya gaya hai. Kripya apna KYC complete karein.</p>
       <p><a href="${kycLink}" style="padding:10px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:5px;">Complete KYC</a></p>
       <p>Yeh link 5 din tak valid hai.</p>`
    );

    res.status(200).json({ message: "KYC link sent successfully to " + superviser.email });
  } catch (error) {
    res.status(500).json({ message: "Error sending link", error: error.message });
  }
});

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// ---- Dashboard ----
router.get('/dashboard', audit('admin_dashboard', 'Admin'), getDashboard);

// ---- Users ----
router.get('/users', validate(listUsersQuerySchema, 'query'), audit('admin_list_users', 'User'), listUsers);
router.get('/users/:id', audit('admin_get_user', 'User'), getUserById);
router.patch('/users/:id/block', validate(blockUserSchema), audit('admin_block_user', 'User'), blockUser);
router.patch('/users/:id/kyc', validate(kycActionSchema), audit('admin_kyc_update', 'User'), updateKyc);
router.patch('/users/:id/promote', validate(promoteUserSchema), audit('admin_promote_user', 'User'), togglePromotion);
router.delete('/users/:id', audit('admin_delete_user', 'User'), deleteUser);   // 👈 ADD

// ---- Fees ----
router.get('/fees', audit('admin_get_fees', 'AdminSettings'), getFees);
router.patch('/fees', validate(updateFeesSchema), audit('admin_update_fees', 'AdminSettings'), updateFees);

// ---- Colonizers ----
router.get('/colonizers', audit('admin_list_colonizers', 'Colonizer'), listColonizers);
router.patch('/colonizers/:id/promote', validate(promoteUserSchema), audit('admin_promote_colonizer', 'Colonizer'), toggleColonizerPromotion);

// ---- Audit Logs ----
router.get('/audit-logs', audit('admin_audit_logs', 'AuditLog'), listAuditLogs);

// ---- Maintenance ----
router.post('/recalculate-ranks', audit('admin_recalc_ranks', 'Admin'), recalculateAllRanks);

module.exports = router;
