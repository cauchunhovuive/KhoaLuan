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
// Hỗ trợ redirect_uri cho mobile app (qua state param)
router.get('/google', (req, res, next) => {
  const redirectUri = req.query.redirect_uri;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: redirectUri || undefined,
  })(req, res, next);
});

// Bước 2: Google redirect về đây sau khi user đồng ý
router.get(
  '/google/callback',
  (req, res, next) => {
    const opts = {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`,
    };
    passport.authenticate('google', opts, (err, data, info) => {
      if (err || !data) {
        return res.redirect(opts.failureRedirect);
      }
      req.user = data;
      // Giữ lại state (chứa mobile redirect URI nếu có)
      req.googleState = req.query.state || '';
      next();
    })(req, res, next);
  },
  googleCallback
);

module.exports = router;
