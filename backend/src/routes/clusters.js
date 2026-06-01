const express = require('express');
const router = express.Router();
const { getClusters, getCluster, createCluster, updateCluster, deleteCluster, runClustering, getClusterStats, getMLClusterProfiles } = require('../controllers/clusterController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/stats', protect, restrictTo('ADMIN'), getClusterStats);
router.get('/ml-profiles', protect, restrictTo('ADMIN'), getMLClusterProfiles);
router.get('/', protect, restrictTo('ADMIN'), getClusters);
router.get('/:id', protect, restrictTo('ADMIN'), getCluster);
router.post('/run', protect, restrictTo('ADMIN'), runClustering);
router.post('/', protect, restrictTo('ADMIN'), createCluster);
router.put('/:id', protect, restrictTo('ADMIN'), updateCluster);
router.delete('/:id', protect, restrictTo('ADMIN'), deleteCluster);

module.exports = router;
