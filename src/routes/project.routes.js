const express = require('express');
const router = express.Router();
const { createProject, getProjectById, getMyProjects } = require('../controllers/projectController'); 
const { protect } = require('../middlewares/auth');

router.post('/', protect, createProject);
router.get('/my', protect, getMyProjects); 

router.get('/:id', getProjectById);

module.exports = router;