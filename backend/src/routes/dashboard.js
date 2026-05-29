const express = require('express');
const router = express.Router();
const { getStats, getSalesChart } = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('ADMIN'));

router.get('/stats', getStats);
router.get('/sales-chart', getSalesChart);

module.exports = router;
