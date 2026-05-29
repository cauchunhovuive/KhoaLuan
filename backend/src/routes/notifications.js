const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', protect, restrictTo('ADMIN'), getNotifications);
router.put('/read-all', protect, restrictTo('ADMIN'), markAllAsRead);
router.put('/:id/read', protect, restrictTo('ADMIN'), markAsRead);

module.exports = router;
