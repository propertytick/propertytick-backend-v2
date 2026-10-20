const express = require('express');
const router = express.Router();

const { landConvert, stampDuty, states, pricePer } = require('../controllers/toolsController');

router.post('/land-convert', landConvert);
router.post('/stamp-duty', stampDuty);
router.post('/price-per-unit', pricePer);
router.get('/states', states);

module.exports = router;
