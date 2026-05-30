const express = require('express');
const router = express.Router();
const {
  getActiveFlashSales, getAllFlashSales, getFlashSale,
  createFlashSale, updateFlashSale, deleteFlashSale,
  addFlashSaleProduct, removeFlashSaleProduct,
} = require('../controllers/flashSaleController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', getActiveFlashSales);
router.get('/admin/all', protect, restrictTo('ADMIN'), getAllFlashSales);
router.get('/:id', getFlashSale);
router.post('/', protect, restrictTo('ADMIN'), createFlashSale);
router.put('/:id', protect, restrictTo('ADMIN'), updateFlashSale);
router.delete('/:id', protect, restrictTo('ADMIN'), deleteFlashSale);
router.post('/:id/products', protect, restrictTo('ADMIN'), addFlashSaleProduct);
router.delete('/:id/products/:productId', protect, restrictTo('ADMIN'), removeFlashSaleProduct);

module.exports = router;
