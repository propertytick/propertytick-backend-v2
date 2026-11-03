const express = require('express');
const router = express.Router();


const { sendContactMessage } = require('../controllers/authController');

router.post('/', sendContactMessage);

module.exports = router;