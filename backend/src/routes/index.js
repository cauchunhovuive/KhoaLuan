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

module.exports = router;
