const express = require('express');
const router = express.Router();
const { createProject, getProjectById, getMyProjects } = require('../controllers/projectController'); 
const { protect } = require('../middlewares/auth');
const Project = require('../models/Project');
router.post('/', protect, createProject);
router.get('/my', protect, getMyProjects); 

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

module.exports = router;