const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, refresh, getMe, updateProfile, logout, changePassword, checkEmail, googleCallback } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// ─── Local auth ───
router.post('/register', register);
router.post('/login', login);
router.post('/check-email', checkEmail);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// ─── Google OAuth ───
// Bước 1: Redirect user đến Google consent screen
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

// Bước 2: Google redirect về đây sau khi user đồng ý
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`,
  }),
  googleCallback
);

module.exports = router;
