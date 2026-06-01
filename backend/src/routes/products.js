const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductBySlug, getFeaturedProducts, logProductView,
} = require('../controllers/productController');
const { protect, protectOptional, restrictTo } = require('../middleware/auth');

router.get('/featured', getFeaturedProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/:id/view', protectOptional, logProductView);
router.post('/', protect, restrictTo('ADMIN'), createProduct);
router.put('/:id', protect, restrictTo('ADMIN'), updateProduct);
router.delete('/:id', protect, restrictTo('ADMIN'), deleteProduct);

module.exports = router;
