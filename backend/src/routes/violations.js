const express = require('express');
const router = express.Router();
const { createViolation, getViolations, updateViolation } = require('../controllers/violationController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', protect, restrictTo('ADMIN'), getViolations);
router.post('/', protect, createViolation);
router.put('/:id', protect, restrictTo('ADMIN'), updateViolation);

module.exports = router;
