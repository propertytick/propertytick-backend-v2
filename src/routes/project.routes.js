const express = require('express');
const router = express.Router();
const { createProject, getProjectById, getMyProjects } = require('../controllers/projectController'); 
const { protect } = require('../middlewares/auth');
const Project = require('../models/Project');
router.post('/', protect, createProject);
router.get('/my', protect, getMyProjects); 

router.get('/:id', getProjectById);

// ✅ Project Delete Route
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