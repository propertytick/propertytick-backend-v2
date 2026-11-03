// const express = require('express');
const router = express.Router();
const { subscribe, listSubscribers } = require('../controllers/newsletterController');

router.post('/subscribe', subscribe);
router.get('/subscribers', listSubscribers); 

module.exports = router;