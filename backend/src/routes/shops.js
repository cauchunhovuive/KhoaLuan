const express = require('express');
const router = express.Router();
const { getShopPage, getShopReviews } = require('../controllers/shopController');
const { protectOptional } = require('../middleware/auth');

// Public routes - get partner shop showcase (with optional auth for follow status)
router.get('/:partnerId', protectOptional, getShopPage);
router.get('/:partnerId/reviews', protectOptional, getShopReviews);

module.exports = router;
