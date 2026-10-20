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
