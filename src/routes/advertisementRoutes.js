const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Advertisement = require('../models/Advertisement');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const cloudinary = require('cloudinary').v2;
const Colonizer = require('../models/Colonizer'); // 👈 Ye import zaroori hai

router.post('/submit', upload.single('image'), async (req, res) => {
  try {
    // Frontend se data receive karo
    const { project, property, colonizer, pinCodes, adType, link } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image required' });
    }

    if (!colonizer) {
      return res.status(400).json({ success: false, message: 'Colonizer/User ID is required' });
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

    // Pincode nikalne ka logic (Colonizer ya Broker dono handle karega)
    let ownerPincode = null;
    
    // 1. Pehle Colonizer me check karo
    const colonizerDoc = await Colonizer.findById(colonizer).catch(() => null);
    if (colonizerDoc) {
      ownerPincode = colonizerDoc?.location?.pincode;
    } else {
      // 2. Agar Colonizer nahi mila, toh User (Broker) me check karo
      const User = require('../models/User');
      const userDoc = await User.findById(colonizer).catch(() => null);
      if (userDoc) {
        ownerPincode = userDoc?.pincode;
      }
    }

    // Pincodes array banayo
    const adPinCodes = JSON.parse(pinCodes || "[]").filter(p => p.length === 6).slice(0, 10);
    if (ownerPincode && !adPinCodes.includes(ownerPincode)) {
      adPinCodes.push(ownerPincode); 
    }

    // Database me ad create karo
    const ad = await Advertisement.create({
      adType: adType || (project ? 'upcoming_project' : 'sell_property'),
      colonizer,
      project: project || undefined,
      property: property || undefined,
      image: imageUrl,
      link: link || '/dashboard',
      pinCodes: adPinCodes, 
      status: 'pending',
    });

    res.json({ success: true, message: 'Ad submitted!', data: ad });
  } catch (err) {
    console.error("Submit Ad Error:", err);
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


// ✅ SINGLE ROUTE: Pincode ya City dono handle karega
router.get('/', async (req, res) => {
  try {
    const { pincode, city } = req.query;
    const now = new Date();
    
    const filter = {
      status: 'active',
      isActive: true,
      $or: [
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: { $lte: now } }
      ],
      $and: [
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    };
    
    // ✅ Pincode Filter
    if (pincode) {
      filter.pinCodes = { $in: [pincode] }; 
    }

    let ads = await Advertisement.find(filter).populate('project');

    // ✅ City Filter (populate ke baad filter karein)
    if (city) {
      ads = ads.filter(ad => {
        const projectCity = ad.project?.location?.city;
        return projectCity && projectCity.toLowerCase() === city.toLowerCase();
      });
    }

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