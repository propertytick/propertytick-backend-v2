const express = require('express');
const router = express.Router();
const { createProject, getProjectById, getMyProjects } = require('../controllers/projectController'); 
const { protect } = require('../middlewares/auth');
const Project = require('../models/Project');

router.post('/', protect, createProject);
router.get('/my', protect, getMyProjects); 

// ✅ SEARCH ROUTE KO YAHAN RAKHO (/:id ke UPAR)
router.get('/search', async (req, res) => {
  try {
    const { pincode, city, q } = req.query;
    const filter = {};

    const searchPincode = pincode || (q && /^\d{6}$/.test(q) ? q : null);
    if (searchPincode) {
      filter['location.pincode'] = searchPincode;
    } else if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    } else if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { 'location.city': { $regex: q, $options: 'i' } },
        { 'location.landmark': { $regex: q, $options: 'i' } },
      ];
    }

    const projects = await Project.find(filter).limit(50);
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', getProjectById);



const Colonizer = require('../models/Colonizer');

router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // ✅ Pehle Colonizer dhundho jo is User se juda ho
    const colonizerDoc = await Colonizer.findOne({ user: req.user._id });
    
    if (!colonizerDoc) {
      return res.status(403).json({ success: false, message: 'Colonizer profile not found' });
    }

    // ✅ Ab project ke colonizer ID se match karo
    if (project.colonizer.toString() !== colonizerDoc._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update karo
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: { project: updatedProject } });
  } catch (err) {
    console.error("Project Update Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Optional: Check karo ki project usi user ka hai
    if (project.colonizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const upload = require('../middlewares/upload'); // Agar middleware hai
const cloudinary = require('cloudinary').v2;

// ✅ Image Upload Route (Frontend se file lega aur Cloudinary pe bhejega)
router.post('/upload-image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file required' });
    }

    // Cloudinary pe upload karo
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'projects' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({ success: true, url: result.secure_url });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get('/search', async (req, res) => {
  try {
    const { pincode, city, q } = req.query;
    const filter = {};

    
    const searchPincode = pincode || (q && /^\d{6}$/.test(q) ? q : null);
    if (searchPincode) {
      filter['location.pincode'] = searchPincode;
    } else if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    } else if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { 'location.city': { $regex: q, $options: 'i' } },
        { 'location.landmark': { $regex: q, $options: 'i' } },
      ];
    }

    const projects = await Project.find(filter).limit(50);
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;