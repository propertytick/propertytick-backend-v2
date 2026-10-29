const express = require('express');
const router = express.Router();
const { expressInterest, getMyInterests, markAsContacted } = require('../controllers/interestController');
const { protect } = require('../middlewares/auth');

// Koi bhi (logged in ya guest) interest dikha sakta hai
router.post('/:propertyId/interest', expressInterest); 

// Sirf logged-in owner apne messages dekh sakta hai
router.use(protect);
router.get('/my', getMyInterests);
router.put('/:id/contacted', markAsContacted);

module.exports = router;