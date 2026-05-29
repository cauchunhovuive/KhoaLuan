const express = require('express');
const router = express.Router();
const { getPersonalizedRecommendations, getSimilarProducts, getTrendingProducts, getClusterRecommendations } = require('../controllers/recommendationController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/trending', getTrendingProducts);
router.get('/similar/:productId', getSimilarProducts);
router.get('/personalized', protect, getPersonalizedRecommendations);
router.get('/cluster/:clusterId', protect, restrictTo('ADMIN'), getClusterRecommendations);

module.exports = router;
