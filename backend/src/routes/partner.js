const express = require('express');
const router = express.Router();
const {
  registerPartner,
  getPartnerDashboard,
  getPartnerProducts,
  createPartnerProduct,
  updatePartnerProduct,
  deletePartnerProduct,
  getPartnerOrders,
  updatePartnerOrderStatus,
  updatePartnerProfile,
  getAllPartners,
  approvePartner,
  getPartnerRevenue,
} = require('../controllers/partnerController');
const { protect, restrictTo } = require('../middleware/auth');

// Public route - register as partner
router.post('/register', registerPartner);

// Partner routes (cần đăng nhập và là PARTNER)
router.get('/dashboard', protect, restrictTo('PARTNER'), getPartnerDashboard);
router.get('/revenue', protect, restrictTo('PARTNER'), getPartnerRevenue);
router.get('/products', protect, restrictTo('PARTNER'), getPartnerProducts);
router.post('/products', protect, restrictTo('PARTNER'), createPartnerProduct);
router.put('/products/:id', protect, restrictTo('PARTNER'), updatePartnerProduct);
router.delete('/products/:id', protect, restrictTo('PARTNER'), deletePartnerProduct);
router.get('/orders', protect, restrictTo('PARTNER'), getPartnerOrders);
router.put('/orders/:id/status', protect, restrictTo('PARTNER'), updatePartnerOrderStatus);

// Partner profile route
router.put('/profile', protect, restrictTo('PARTNER'), updatePartnerProfile);

// Admin routes - quản lý partner
router.get('/admin/all', protect, restrictTo('ADMIN'), getAllPartners);
router.put('/admin/:id/approve', protect, restrictTo('ADMIN'), approvePartner);

module.exports = router;
