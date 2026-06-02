/**
 * MoMo Payment Service
 * 
 * Tích hợp cổng thanh toán MoMo qua MoMo API v2:
 * - Capture Wallet: tạo thanh toán ví MoMo
 * - Xác thực chữ ký từ MoMo callback
 * - Xử lý IPN (Instant Payment Notification)
 */

const crypto = require('crypto');
const logger = require('../config/logger');

// ─── Cấu hình MoMo ──────────────────────────────────────────
const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE || '';
const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY || '';
const MOMO_SECRET_KEY = process.env.MOMO_SECRET_KEY || '';
const MOMO_API_URL = process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';
const MOMO_REDIRECT_URL = process.env.MOMO_REDIRECT_URL || 'http://localhost:5000/api/payments/momo/return';
const MOMO_IPN_URL = process.env.MOMO_IPN_URL || 'http://localhost:5000/api/payments/momo/ipn';

/**
 * Tạo chữ ký HMAC-SHA256 cho MoMo
 * 
 * MoMo yêu cầu nối các tham số theo thứ tự:
 * accessKey + "&" + amount + "&" + extraData + "&" + ipnUrl + "&" + orderId + "&" + orderInfo + "&" + partnerCode + "&" + redirectUrl + "&" + requestId + "&" + requestType
 */
function createSignature(dataString, secretKey) {
  return crypto.createHmac('sha256', secretKey)
    .update(dataString)
    .digest('hex');
}

/**
 * Tạo thanh toán MoMo (Capture Wallet)
 * 
 * @param {Object} options
 * @param {string} options.orderId - Mã đơn hàng
 * @param {number} options.amount - Số tiền
 * @param {string} options.orderInfo - Mô tả đơn hàng
 * @param {string} [options.requestType='captureWallet'] - Loại yêu cầu
 * @param {string} [options.extraData=''] - Dữ liệu thêm (base64 encode nếu có)
 * @returns {Promise<{payUrl: string, qrCodeUrl: string, deeplink: string, error: string}>}
 */
async function createPayment({
  orderId,
  amount,
  orderInfo,
  requestType = 'captureWallet',
  extraData = '',
}) {
  if (!MOMO_PARTNER_CODE || !MOMO_ACCESS_KEY || !MOMO_SECRET_KEY) {
    throw new Error('MoMo chưa được cấu hình (thiếu PARTNER_CODE, ACCESS_KEY hoặc SECRET_KEY)');
  }

  const requestId = orderId;
  const rawSignature = [
    `accessKey=${MOMO_ACCESS_KEY}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${MOMO_IPN_URL}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${MOMO_PARTNER_CODE}`,
    `redirectUrl=${MOMO_REDIRECT_URL}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&');

  const signature = createSignature(rawSignature, MOMO_SECRET_KEY);

  const requestBody = {
    partnerCode: MOMO_PARTNER_CODE,
    partnerName: 'KhoaLuan Ecommerce',
    storeId: 'KhoaLuan',
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: MOMO_REDIRECT_URL,
    ipnUrl: MOMO_IPN_URL,
    lang: 'vi',
    extraData,
    requestType,
    signature,
    autoCapture: true,
  };

  try {
    logger.info(`MoMo creating payment for order ${orderId}, amount: ${amount}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(MOMO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`MoMo API returned ${response.status}`);
    }

    const result = await response.json();

    if (result.resultCode === 0) {
      logger.info(`MoMo payment created: order ${orderId}, payUrl generated`);
      return {
        success: true,
        payUrl: result.payUrl,
        qrCodeUrl: result.qrCodeUrl || null,
        deeplink: result.deeplink || null,
        deeplinkMiniApp: result.deeplinkMiniApp || null,
        momoTransId: result.transId || null,
        message: result.message,
      };
    }

    logger.error(`MoMo payment failed: ${result.resultCode} - ${result.message}`);
    return {
      success: false,
      error: result.message || 'Không thể tạo thanh toán MoMo',
      resultCode: result.resultCode,
    };
  } catch (error) {
    logger.error(`MoMo API error: ${error.message}`);
    return {
      success: false,
      error: 'Lỗi kết nối MoMo: ' + error.message,
    };
  }
}

/**
 * Xác thực chữ ký từ MoMo callback (IPN hoặc Redirect)
 * 
 * MoMo gửi signature được tạo từ:
 * accessKey + "&" + amount + "&" + extraData + "&" + message + "&" + orderId + "&" + orderInfo + "&" + orderType + "&" + partnerCode + "&" + payType + "&" + requestId + "&" + responseTime + "&" + resultCode + "&" + transId
 * 
 * @param {Object} momoParams - Dữ liệu từ MoMo (req.body)
 * @returns {{ isValid: boolean, data: Object }}
 */
function verifyReturn(momoParams) {
  const receivedSignature = momoParams.signature;
  if (!receivedSignature) {
    return { isValid: false, data: null, error: 'Missing signature' };
  }

  // MoMo signature raw string
  const rawSignature = [
    `accessKey=${MOMO_ACCESS_KEY}`,
    `amount=${momoParams.amount || ''}`,
    `extraData=${momoParams.extraData || ''}`,
    `message=${momoParams.message || ''}`,
    `orderId=${momoParams.orderId || ''}`,
    `orderInfo=${momoParams.orderInfo || ''}`,
    `orderType=${momoParams.orderType || ''}`,
    `partnerCode=${MOMO_PARTNER_CODE}`,
    `payType=${momoParams.payType || ''}`,
    `requestId=${momoParams.requestId || ''}`,
    `responseTime=${momoParams.responseTime || ''}`,
    `resultCode=${momoParams.resultCode || ''}`,
    `transId=${momoParams.transId || ''}`,
  ].join('&');

  const computedSignature = createSignature(rawSignature, MOMO_SECRET_KEY);
  const isValid = computedSignature === receivedSignature;

  if (!isValid) {
    logger.warn(`MoMo signature verification failed for order ${momoParams.orderId}`);
  }

  return {
    isValid,
    data: {
      orderId: momoParams.orderId,
      amount: parseInt(momoParams.amount) || 0,
      transId: momoParams.transId,
      resultCode: momoParams.resultCode,
      message: momoParams.message,
      payType: momoParams.payType,
      responseTime: momoParams.responseTime,
      extraData: momoParams.extraData,
    },
    error: isValid ? null : 'Invalid signature',
  };
}

/**
 * Xử lý IPN từ MoMo
 * 
 * @param {Object} momoParams - Body từ MoMo IPN
 * @returns {{ success: boolean, data: Object, error: string }}
 */
function processIPN(momoParams) {
  const { isValid, data } = verifyReturn(momoParams);

  if (!isValid) {
    return { success: false, error: 'Invalid signature', data: null };
  }

  // resultCode = 0: thành công
  if (data.resultCode === 0) {
    return {
      success: true,
      data: {
        ...data,
        paymentMethod: 'MOMO',
        paid: true,
      },
    };
  }

  return {
    success: false,
    data,
    error: `MoMo payment failed: resultCode=${data.resultCode}`,
  };
}

module.exports = {
  createPayment,
  verifyReturn,
  processIPN,
};
