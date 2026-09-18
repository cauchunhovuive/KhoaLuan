const express = require('express');
const router = express.Router();
const { getProductReviews, createReview, updateReview, deleteReview, replyReview, getPartnerReviews } = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/product/:productId', getProductReviews);
router.get('/partner', protect, restrictTo('PARTNER', 'ADMIN'), getPartnerReviews);
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.put('/:id/reply', protect, restrictTo('PARTNER', 'ADMIN'), replyReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
