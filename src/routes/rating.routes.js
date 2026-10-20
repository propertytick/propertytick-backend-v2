const express = require('express');
const router = express.Router();

const { createRating, getUserRatings, deleteRating } = require('../controllers/ratingController');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const { createRatingSchema } = require('../validators/ratingValidator');

router.get('/user/:id', getUserRatings);

router.post('/', protect, validate(createRatingSchema), createRating);
router.delete('/:id', protect, deleteRating);

module.exports = router;
