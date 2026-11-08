const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Advertisement = require('../models/Advertisement');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const cloudinary = require('cloudinary').v2;


router.post('/submit', upload.single('image'), async (req, res) => {
  try {
    const { token, project, colonizer, pinCodes } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image required' });
    }

   
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'ads' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    const imageUrl = result.secure_url;

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


router.get('/', async (req, res) => {
  try {
    const { pincode } = req.query;
    const now = new Date();
    
    // Flexible filter (Agar date nahi hai toh bhi allow karo)
    const filter = {
      status: 'active',
      isActive: true,
      $or: [
        { startDate: { $exists: false } }, // Agar date nahi hai
        { startDate: null },
        { startDate: { $lte: now } }       // Ya aaj se pehle ki hai
      ],
      $and: [
        {
          $or: [
            { endDate: { $exists: false } }, // Agar date nahi hai
            { endDate: null },
            { endDate: { $gte: now } }       // Ya aaj ke baad ki hai
          ]
        }
      ]
    };
    
    if (pincode) filter.pinCodes = pincode;

    const ads = await Advertisement.find(filter).populate('project');
    res.json({ success: true, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


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