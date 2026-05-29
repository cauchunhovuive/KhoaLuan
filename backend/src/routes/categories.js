const express = require('express');
const router = express.Router();
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', protect, restrictTo('ADMIN'), createCategory);
router.put('/:id', protect, restrictTo('ADMIN'), updateCategory);
router.delete('/:id', protect, restrictTo('ADMIN'), deleteCategory);

module.exports = router;
