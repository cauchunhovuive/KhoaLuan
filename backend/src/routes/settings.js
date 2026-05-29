const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', getSettings);
router.put('/', protect, restrictTo('ADMIN'), updateSettings);

module.exports = router;
