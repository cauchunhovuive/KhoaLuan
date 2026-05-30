const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, cancelOrder, updateOrderStatus, getAllOrders } = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/admin/all', protect, restrictTo('ADMIN'), getAllOrders);
router.get('/', protect, getMyOrders);
router.post('/', protect, createOrder);
router.get('/:id', protect, getOrder);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/status', protect, restrictTo('ADMIN', 'PARTNER'), updateOrderStatus);

module.exports = router;
