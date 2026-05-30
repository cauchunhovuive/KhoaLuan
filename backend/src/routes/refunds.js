const express = require('express');
const router = express.Router();
const { createRefund, getMyRefunds, getAllRefunds, updateRefundStatus } = require('../controllers/refundController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/my', protect, getMyRefunds);
router.get('/', protect, restrictTo('ADMIN'), getAllRefunds);
router.post('/', protect, createRefund);
router.put('/:id', protect, restrictTo('ADMIN'), updateRefundStatus);

module.exports = router;
