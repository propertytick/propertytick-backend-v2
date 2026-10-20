const express = require('express');
const router = express.Router();

const {
  createProperty,
  listProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getMyProperties,
  lockPropertyShield,
  generatePropertyCardImage,      // 👈 YEH ADD KARO (ek hi import mein)
} = require('../controllers/propertyController');

const validate = require('../middlewares/validate');
const { protect, optionalAuth } = require('../middlewares/auth');
const audit = require('../middlewares/auditLogger');
const { createPropertySchema, listPropertyQuerySchema } = require('../validators/propertyValidator');

// Public
router.get('/', optionalAuth, validate(listPropertyQuerySchema, 'query'), listProperties);
router.get('/my', protect, getMyProperties);
router.get('/:id/card', optionalAuth, generatePropertyCardImage);   // 👈 YEH UPAR RAKHO
router.get('/:id', optionalAuth, getPropertyById);                  // 👈 YEH NEECHE

// Protected
router.post('/', protect, validate(createPropertySchema), audit('property_create', 'Property'), createProperty);
router.patch('/:id', protect, audit('property_update', 'Property'), updateProperty);
router.delete('/:id', protect, audit('property_delete', 'Property'), deleteProperty);
router.post('/lock-shield', protect, audit('property_shield', 'PropertyShield'), lockPropertyShield);

module.exports = router;
