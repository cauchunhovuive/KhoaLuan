const express = require('express');
const router = express.Router();
const {
  getSessionRecommendations,
  trainSessionModel,
  getMLHealth,
} = require('../controllers/mlController');
const { protect } = require('../middleware/auth');

// Public endpoints
router.post('/session/recommend', getSessionRecommendations);
router.get('/health', getMLHealth);

// Authenticated endpoints
router.post('/session/train', protect, trainSessionModel);

module.exports = router;
