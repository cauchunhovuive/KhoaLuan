const express = require('express');
const router = express.Router();
const {
  getSessionRecommendations,
  trainSessionModel,
  trainCFModel,
  trainGraphCFModel,
  recommendGraphCF,
  trainLightGCNCFModel,
  recommendLightGCNCF,
  explainRecommendations,
  evaluateModels,
  getABTestReport,
  logABTestInteraction,
  compareABTestGroups,
  resetABTest,
  getMLHealth,
  getPaperData,
  runPaperBenchmark,
  resetPaperBenchmark,
  paperRecommend,
} = require('../controllers/mlController');
const { protect, restrictTo } = require('../middleware/auth');

// Public endpoints
router.post('/session/recommend', getSessionRecommendations);
router.get('/health', getMLHealth);

// Authenticated endpoints
router.post('/session/train', protect, trainSessionModel);
router.get('/paper/data', protect, restrictTo('ADMIN'), getPaperData);
router.post('/paper/benchmark', protect, restrictTo('ADMIN'), runPaperBenchmark);
router.post('/paper/reset', protect, restrictTo('ADMIN'), resetPaperBenchmark);
router.post('/paper/recommend', protect, restrictTo('ADMIN'), paperRecommend);
router.post('/explain', protect, restrictTo('ADMIN'), explainRecommendations);
router.post('/evaluate', protect, restrictTo('ADMIN'), evaluateModels);

// Collaborative Filtering (Admin only)
router.post('/cf/train', protect, restrictTo('ADMIN'), trainCFModel);

// Graph CF & LightGCN-CF (Admin only) — Li & Zhang 2025
router.post('/graphcf/train', protect, restrictTo('ADMIN'), trainGraphCFModel);
router.post('/graphcf/recommend', protect, restrictTo('ADMIN'), recommendGraphCF);
router.post('/lightgcncf/train', protect, restrictTo('ADMIN'), trainLightGCNCFModel);
router.post('/lightgcncf/recommend', protect, restrictTo('ADMIN'), recommendLightGCNCF);

// A/B Testing (Admin only)
router.get('/abtest/report', protect, restrictTo('ADMIN'), getABTestReport);
router.post('/abtest/log', protect, logABTestInteraction);
router.post('/abtest/compare', protect, restrictTo('ADMIN'), compareABTestGroups);
router.post('/abtest/reset', protect, restrictTo('ADMIN'), resetABTest);

module.exports = router;
