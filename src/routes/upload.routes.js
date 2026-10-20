const express = require('express');
const router = express.Router();

const {
  uploadSingleImage,
  uploadMultipleImages,
} = require('../controllers/uploadController');

const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const audit = require('../middlewares/auditLogger');

// All upload routes require authentication
router.use(protect);

// Single image
router.post(
  '/image',
  upload.single('image'),
  audit('image_upload', 'Upload'),
  uploadSingleImage
);

// Multiple images (max 10)
router.post(
  '/multiple',
  upload.array('images', 10),
  audit('images_upload', 'Upload'),
  uploadMultipleImages
);

module.exports = router;
