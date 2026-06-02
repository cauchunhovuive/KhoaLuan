const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createVNPayPayment,
  vnpayReturn,
  vnpayIPN,
  createMoMoPayment,
  momoReturn,
  momoIPN,
  getPaymentStatus,
} = require('../controllers/paymentController');

// ─── VNPay ──────────────────────────────────────────────────
router.post('/vnpay/create', protect, createVNPayPayment);
router.get('/vnpay/return', vnpayReturn);     // Redirect từ VNPay (không cần auth)
router.get('/vnpay/ipn', vnpayIPN);            // Server-to-server (không cần auth)

// ─── MoMo ───────────────────────────────────────────────────
router.post('/momo/create', protect, createMoMoPayment);
router.post('/momo/return', momoReturn);       // Redirect từ MoMo (không cần auth)
router.post('/momo/ipn', momoIPN);             // Server-to-server (không cần auth)

// ─── Check Payment Status ───────────────────────────────────
router.get('/status/:orderId', protect, getPaymentStatus);

module.exports = router;
