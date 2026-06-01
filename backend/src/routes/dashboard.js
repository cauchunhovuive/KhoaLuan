const express = require('express');
const router = express.Router();
const { getStats, getSalesChart, getMonthlyChart, getCategoryChart, getOrderStatusChart, getUserGrowth, getRecentOrders } = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('ADMIN'));

router.get('/stats', getStats);
router.get('/sales-chart', getSalesChart);
router.get('/monthly-chart', getMonthlyChart);
router.get('/category-chart', getCategoryChart);
router.get('/order-status-chart', getOrderStatusChart);
router.get('/user-growth', getUserGrowth);
router.get('/recent-orders', getRecentOrders);

module.exports = router;
