const express = require('express');
const router = express.Router();
const { getBanners, getAllBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/bannerController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', getBanners);
router.get('/admin/all', protect, restrictTo('ADMIN'), getAllBanners);
router.post('/', protect, restrictTo('ADMIN'), createBanner);
router.put('/:id', protect, restrictTo('ADMIN'), updateBanner);
router.delete('/:id', protect, restrictTo('ADMIN'), deleteBanner);

module.exports = router;
