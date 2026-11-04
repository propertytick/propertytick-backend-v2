const express = require('express');
const router = express.Router();
const { createProject, getProjectById } = require('../controllers/projectController');
const { protect } = require('../middlewares/auth');


router.post('/', protect, createProject);


router.get('/:id', getProjectById);

module.exports = router;