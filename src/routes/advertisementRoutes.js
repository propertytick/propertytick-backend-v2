const express = require('express');
const router = express.Router();
const Advertisement = require('../models/Advertisement');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload'); // agar upload middleware hai

// 1. Colonizer: Ad submit karna (photo + pin codes)
router.post('/submit', upload.single('image'), async (req, res) => {
  try {
    const { token, project, colonizer, pinCodes } = req.body;
    const imageUrl = req.file ? req.file.path : '';

    const ad = await Advertisement.create({
      colonizer,
      project,
      image: imageUrl,
      link: `/project/${project}`,
      pinCodes: JSON.parse(pinCodes).filter(p => p.length === 6).slice(0, 10),
      status: 'pending',
    });

    res.json({ success: true, message: 'Ad submitted!', data: ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Colonizer: Apne ads dekhna (dashboard)
router.get('/my', protect, async (req, res) => {
  try {
    const ads = await Advertisement.find({ colonizer: req.user._id })
      .populate('project', 'projectName projectSlug')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. User: Pin code ke hisaab se ad fetch karna (homepage)
router.get('/', async (req, res) => {
  try {
    const { pincode } = req.query;
    if (!pincode) return res.json({ success: true, data: null });

    const ad = await Advertisement.findOne({
      pinCodes: pincode,
      status: 'active',
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Colonizer: Single ad preview
router.get('/:id', protect, async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id).populate('project');
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    if (ad.colonizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;