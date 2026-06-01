const express = require('express');
const router = express.Router();
const {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getMyCoupons,
  validateCoupon,
  getAvailableCoupons,
  saveCoupon,
  removeSavedCoupon,
  getSavedCoupons,
} = require('../controllers/couponController');
const { protect, restrictTo } = require('../middleware/auth');

// Customer routes
router.get('/available', protect, getAvailableCoupons);
router.get('/saved', protect, getSavedCoupons);
router.post('/saved/:couponId', protect, saveCoupon);
router.delete('/saved/:couponId', protect, removeSavedCoupon);
router.post('/validate', protect, validateCoupon);

// Partner routes - quản lý coupon của mình
router.get('/my', protect, restrictTo('PARTNER'), getMyCoupons);
router.post('/', protect, restrictTo('PARTNER', 'ADMIN'), createCoupon);
router.put('/:id', protect, restrictTo('PARTNER', 'ADMIN'), updateCoupon);
router.delete('/:id', protect, restrictTo('PARTNER', 'ADMIN'), deleteCoupon);

// Admin routes - quản lý tất cả coupon
router.get('/', protect, restrictTo('ADMIN'), getAllCoupons);

module.exports = router;
