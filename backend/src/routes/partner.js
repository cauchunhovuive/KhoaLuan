const express = require('express');
const router = express.Router();
const {
  registerPartner,
  getPartnerDashboard,
  getPartnerProducts,
  getPartnerOrders,
  updatePartnerOrderStatus,
  updatePartnerProfile,
  getAllPartners,
  approvePartner,
} = require('../controllers/partnerController');
const { protect, restrictTo } = require('../middleware/auth');

// Public route - register as partner
router.post('/register', registerPartner);

// Partner routes (cần đăng nhập và là PARTNER)
router.get('/dashboard', protect, restrictTo('PARTNER'), getPartnerDashboard);
router.get('/products', protect, restrictTo('PARTNER'), getPartnerProducts);
router.get('/orders', protect, restrictTo('PARTNER'), getPartnerOrders);
router.put('/orders/:id/status', protect, restrictTo('PARTNER'), updatePartnerOrderStatus);

// Partner profile route
router.put('/profile', protect, restrictTo('PARTNER'), updatePartnerProfile);

// Admin routes - quản lý partner
router.get('/admin/all', protect, restrictTo('ADMIN'), getAllPartners);
router.put('/admin/:id/approve', protect, restrictTo('ADMIN'), approvePartner);

module.exports = router;
