const express = require('express');
const router = express.Router();
const { expressInterest, getMyInterests, markAsContacted } = require('../controllers/interestController');
const { protect } = require('../middlewares/auth');

// ✅ Interest Express Route (Public - login zaroori nahi)
router.post('/:propertyId/interest', expressInterest);

// ✅ Protected Routes
router.use(protect);
router.get('/my', getMyInterests);
router.put('/:id/contacted', markAsContacted);

module.exports = router;