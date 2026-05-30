const express = require('express');
const router = express.Router();
const { getUsers, getUser, updateUser, deleteUser, followShop, unfollowShop, getFollowedShops } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

// User follow routes (user-only, not admin)
router.post('/follow', protect, followShop);
router.get('/follow', protect, getFollowedShops);
router.delete('/follow/:partnerId', protect, unfollowShop);

// Admin-only routes below
router.use(protect, restrictTo('ADMIN'));

router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
