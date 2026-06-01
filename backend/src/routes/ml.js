const express = require('express');
const router = express.Router();
const {
  getSessionRecommendations,
  trainSessionModel,
  trainCFModel,
  explainRecommendations,
  evaluateModels,
  getABTestReport,
  logABTestInteraction,
  compareABTestGroups,
  resetABTest,
  getMLHealth,
} = require('../controllers/mlController');
const { protect, restrictTo } = require('../middleware/auth');

// Public endpoints
router.post('/session/recommend', getSessionRecommendations);
router.get('/health', getMLHealth);

// Authenticated endpoints
router.post('/session/train', protect, trainSessionModel);
router.post('/explain', protect, restrictTo('ADMIN'), explainRecommendations);
router.post('/evaluate', protect, restrictTo('ADMIN'), evaluateModels);

// Collaborative Filtering (Admin only)
router.post('/cf/train', protect, restrictTo('ADMIN'), trainCFModel);

// A/B Testing (Admin only)
router.get('/abtest/report', protect, restrictTo('ADMIN'), getABTestReport);
router.post('/abtest/log', protect, logABTestInteraction);
router.post('/abtest/compare', protect, restrictTo('ADMIN'), compareABTestGroups);
router.post('/abtest/reset', protect, restrictTo('ADMIN'), resetABTest);

module.exports = router;
