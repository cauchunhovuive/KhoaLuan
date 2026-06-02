/**
 * VNPay Payment Service
 * 
 * Tích hợp cổng thanh toán VNPay:
 * - Tạo URL thanh toán (sandbox/production)
 * - Xác thực chữ ký từ VNPay callback
 * - Xử lý IPN (Instant Payment Notification)
 */

const crypto = require('crypto');
const querystring = require('querystring');
const logger = require('../config/logger');

// ─── Cấu hình VNPay ─────────────────────────────────────────
const VNP_TMN_CODE = process.env.VNP_TMN_CODE || '';
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';
const VNP_URL = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL = process.env.VNP_RETURN_URL || 'http://localhost:5000/api/payments/vnpay/return';
const VNP_IPN_URL = process.env.VNP_IPN_URL || 'http://localhost:5000/api/payments/vnpay/ipn';

/**
 * Sắp xếp object theo key alphabet
 */
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

/**
 * Tạo chữ ký HMAC-SHA512 cho VNPay
 */
function generateSignature(params, secretKey) {
  const sorted = sortObject(params);
  const signData = querystring.stringify(sorted, '&', '=', { encodeURIComponent: (s) => s });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  return signed;
}

/**
 * Tạo URL thanh toán VNPay
 * 
 * @param {Object} options
 * @param {string} options.orderId - Mã đơn hàng (vnp_TxnRef)
 * @param {number} options.amount - Số tiền (VNĐ)
 * @param {string} options.orderInfo - Mô tả đơn hàng
 * @param {string} options.ipAddr - IP của khách hàng
 * @param {string} [options.locale='vn'] - Ngôn ngữ (vn/en)
 * @param {string} [options.bankCode] - Mã ngân hàng (nếu muốn chọn trước)
 * @returns {string} URL thanh toán
 */
function createPaymentUrl({
  orderId,
  amount,
  orderInfo,
  ipAddr,
  locale = 'vn',
  bankCode,
}) {
  if (!VNP_TMN_CODE || !VNP_HASH_SECRET) {
    throw new Error('VNP_TMN_CODE hoặc VNP_HASH_SECRET chưa được cấu hình');
  }

  const date = new Date();
  const createDate = date.toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14); // yyyyMMddHHmmss
  const expireDate = new Date(date.getTime() + 15 * 60 * 1000)
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14); // +15 phút

  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Amount: Math.round(amount * 100), // VNPay nhân *100
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: locale,
    vnp_ReturnUrl: VNP_RETURN_URL,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode) {
    params.vnp_BankCode = bankCode;
  }

  // Tạo chữ ký
  const vnp_SecureHash = generateSignature(params, VNP_HASH_SECRET);
  params.vnp_SecureHash = vnp_SecureHash;

  // Tạo URL
  const url = `${VNP_URL}?${querystring.stringify(params)}`;
  logger.info(`VNPay payment URL created for order ${orderId}, amount: ${amount}`);
  return url;
}

/**
 * Xác thực chữ ký từ VNPay callback (Return URL hoặc IPN)
 * 
 * @param {Object} vnpParams - Query params từ VNPay
 * @returns {{ isValid: boolean, data: Object }}
 */
function verifyReturn(vnpParams) {
  const secureHash = vnpParams['vnp_SecureHash'];
  if (!secureHash) {
    return { isValid: false, data: null, error: 'Missing vnp_SecureHash' };
  }

  // Loại bỏ các tham số không dùng để tính hash
  const params = { ...vnpParams };
  delete params['vnp_SecureHash'];
  delete params['vnp_SecureHashType'];

  const signed = generateSignature(params, VNP_HASH_SECRET);
  const isValid = signed === secureHash;

  if (!isValid) {
    logger.warn(`VNPay signature verification failed for order ${params.vnp_TxnRef}`);
  }

  return {
    isValid,
    data: {
      orderId: params.vnp_TxnRef,
      amount: parseInt(params.vnp_Amount) / 100,
      bankCode: params.vnp_BankCode,
      cardType: params.vnp_CardType,
      payDate: params.vnp_PayDate,
      transactionNo: params.vnp_TransactionNo,
      transactionStatus: params.vnp_TransactionStatus,
      responseCode: params.vnp_ResponseCode,
      orderInfo: params.vnp_OrderInfo,
    },
    error: isValid ? null : 'Invalid signature',
  };
}

/**
 * Xử lý IPN (server-to-server notification từ VNPay)
 * 
 * @param {Object} vnpParams - Query params từ VNPay IPN
 * @returns {{ RspCode: string, Message: string }}
 */
function processIPN(vnpParams) {
  const { isValid, data } = verifyReturn(vnpParams);

  if (!isValid) {
    return { RspCode: '97', Message: 'Invalid signature' };
  }

  // Transaction status: 00 = success
  if (data.responseCode === '00') {
    return {
      RspCode: '00',
      Message: 'Success',
      data,
    };
  }

  return {
    RspCode: data.responseCode || '99',
    Message: 'Payment not completed',
    data,
  };
}

module.exports = {
  createPaymentUrl,
  verifyReturn,
  processIPN,
};
