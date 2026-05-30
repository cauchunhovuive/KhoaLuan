const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, getProductBySlug, getFeaturedProducts,
} = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/featured', getFeaturedProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', protect, restrictTo('ADMIN', 'PARTNER'), createProduct);
router.put('/:id', protect, restrictTo('ADMIN', 'PARTNER'), updateProduct);
router.delete('/:id', protect, restrictTo('ADMIN', 'PARTNER'), deleteProduct);

module.exports = router;
