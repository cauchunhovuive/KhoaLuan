const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/products', require('./products'));
router.use('/categories', require('./categories'));
router.use('/orders', require('./orders'));
router.use('/cart', require('./cart'));
router.use('/users', require('./users'));
router.use('/clusters', require('./clusters'));
router.use('/recommendations', require('./recommendations'));
router.use('/dashboard', require('./dashboard'));
router.use('/reviews', require('./reviews'));
router.use('/settings', require('./settings'));
router.use('/notifications', require('./notifications'));
router.use('/coupons', require('./coupons'));
router.use('/partner', require('./partner'));
router.use('/addresses', require('./addresses'));
router.use('/chat', require('./chat'));
router.use('/banners', require('./banners'));
router.use('/flash-sales', require('./flashSales'));
router.use('/refunds', require('./refunds'));
router.use('/violations', require('./violations'));
router.use('/audit', require('./audit'));
router.use('/shops', require('./shops'));
router.use('/ml', require('./ml'));
router.use('/payments', require('./payments'));

module.exports = router;
