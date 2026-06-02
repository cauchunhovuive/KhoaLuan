/**
 * Payment Controller
 * 
 * Xử lý thanh toán qua VNPay và MoMo:
 * - Tạo URL thanh toán
 * - Xử lý callback (return URL)
 * - Xử lý IPN (server-to-server)
 * - Kiểm tra trạng thái thanh toán
 */

const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const vnpayService = require('../services/vnpayService');
const momoService = require('../services/momoService');

// ─── Tiện ích ───────────────────────────────────────────────

/**
 * Lấy IP thật của khách hàng
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.ip
    || '127.0.0.1';
}

/**
 * Cập nhật trạng thái thanh toán đơn hàng
 */
async function updateOrderPayment(orderId, { paymentMethod, paymentStatus, transactionId, transactionNo, paidAt }) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: paymentMethod || undefined,
      paymentStatus,
      ...(transactionId ? { transactionId } : {}),
      ...(transactionNo ? { transactionNo } : {}),
      ...(paidAt ? { paidAt } : { paidAt: paymentStatus === 'PAID' ? new Date() : undefined }),
    },
  });
}

// ═════════════════════════════════════════════════════════════
// VNPay
// ═════════════════════════════════════════════════════════════

// @desc    Tạo URL thanh toán VNPay
// @route   POST /api/payments/vnpay/create
const createVNPayPayment = asyncHandler(async (req, res) => {
  const { orderId, bankCode } = req.body;

  if (!orderId) {
    throw new AppError('Thiếu mã đơn hàng', 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, finalAmount: true, paymentStatus: true, userId: true },
  });

  if (!order) {
    throw new AppError('Đơn hàng không tồn tại', 404);
  }

  if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Bạn không có quyền thanh toán đơn hàng này', 403);
  }

  if (order.paymentStatus === 'PAID') {
    throw new AppError('Đơn hàng đã được thanh toán', 400);
  }

  const ipAddr = getClientIp(req);
  const orderInfo = `KhoaLuan: Thanh toan don hang ${orderId.slice(0, 8)}`;

  try {
    const paymentUrl = vnpayService.createPaymentUrl({
      orderId: order.id,
      amount: Math.round(order.finalAmount),
      orderInfo,
      ipAddr,
      bankCode,
    });

    // Cập nhật payment method
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentMethod: 'VNPAY' },
    });

    res.json({
      success: true,
      data: {
        paymentUrl,
        orderId: order.id,
        amount: order.finalAmount,
      },
    });
  } catch (error) {
    logger.error(`VNPay create error: ${error.message}`);
    throw new AppError(error.message || 'Lỗi tạo thanh toán VNPay', 500);
  }
});

// @desc    Xử lý return URL từ VNPay (redirect từ cổng thanh toán)
// @route   GET /api/payments/vnpay/return
const vnpayReturn = asyncHandler(async (req, res) => {
  const result = vnpayService.verifyReturn(req.query);

  if (!result.isValid) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=false&message=Chữ+ký+không+hợp+lệ`);
  }

  const { data } = result;

  // Transaction status: 00 = success
  const isSuccess = data.responseCode === '00';

  if (isSuccess) {
    // Cập nhật trạng thái đơn hàng
    try {
      await updateOrderPayment(data.orderId, {
        paymentMethod: 'VNPAY',
        paymentStatus: 'PAID',
        transactionNo: data.transactionNo,
        transactionId: data.transactionNo,
        paidAt: data.payDate ? new Date(data.payDate) : new Date(),
      });

      logger.info(`VNPay payment success: order ${data.orderId}, trans ${data.transactionNo}`);

      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${data.orderId}?payment=success`
      );
    } catch (err) {
      logger.error(`VNPay update order error: ${err.message}`);
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=true&message=Thanh+toán+thành+công&orderId=${data.orderId}`
      );
    }
  }

  return res.redirect(
    `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=false&message=Thanh+toán+thất+bại&orderId=${data.orderId}`
  );
});

// @desc    Xử lý IPN từ VNPay (server-to-server)
// @route   GET /api/payments/vnpay/ipn
const vnpayIPN = asyncHandler(async (req, res) => {
  const result = vnpayService.processIPN(req.query);

  if (result.RspCode === '00' && result.data) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: result.data.orderId },
        select: { paymentStatus: true, finalAmount: true },
      });

      if (!order) {
        return res.json({ RspCode: '01', Message: 'Order not found' });
      }

      if (order.paymentStatus === 'PAID') {
        return res.json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      // Kiểm tra số tiền
      const paidAmount = Math.round(order.finalAmount);
      const vnpayAmount = result.data.amount;
      if (Math.abs(paidAmount - vnpayAmount) > 100) {
        return res.json({ RspCode: '04', Message: 'Invalid amount' });
      }

      // Cập nhật trạng thái
      await updateOrderPayment(result.data.orderId, {
        paymentMethod: 'VNPAY',
        paymentStatus: 'PAID',
        transactionNo: result.data.transactionNo,
        transactionId: result.data.transactionNo,
      });

      logger.info(`VNPay IPN processed: order ${result.data.orderId}`);
    } catch (err) {
      logger.error(`VNPay IPN error: ${err.message}`);
      return res.json({ RspCode: '99', Message: 'Internal error' });
    }
  }

  res.json({ RspCode: result.RspCode, Message: result.Message });
});

// ═════════════════════════════════════════════════════════════
// MoMo
// ═════════════════════════════════════════════════════════════

// @desc    Tạo thanh toán MoMo
// @route   POST /api/payments/momo/create
const createMoMoPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    throw new AppError('Thiếu mã đơn hàng', 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, finalAmount: true, paymentStatus: true, userId: true },
  });

  if (!order) {
    throw new AppError('Đơn hàng không tồn tại', 404);
  }

  if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Bạn không có quyền thanh toán đơn hàng này', 403);
  }

  if (order.paymentStatus === 'PAID') {
    throw new AppError('Đơn hàng đã được thanh toán', 400);
  }

  const orderInfo = `KhoaLuan: Thanh toan don hang ${orderId.slice(0, 8)}`;

  try {
    const result = await momoService.createPayment({
      orderId: order.id,
      amount: Math.round(order.finalAmount),
      orderInfo,
    });

    if (result.success) {
      // Cập nhật payment method
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentMethod: 'MOMO' },
      });

      return res.json({
        success: true,
        data: {
          payUrl: result.payUrl,
          qrCodeUrl: result.qrCodeUrl,
          deeplink: result.deeplink,
          deeplinkMiniApp: result.deeplinkMiniApp,
          orderId: order.id,
          amount: order.finalAmount,
        },
      });
    }

    throw new AppError(result.error || 'Không thể tạo thanh toán MoMo', 500);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`MoMo create error: ${error.message}`);
    throw new AppError(error.message || 'Lỗi tạo thanh toán MoMo', 500);
  }
});

// @desc    Xử lý return URL từ MoMo
// @route   POST /api/payments/momo/return
const momoReturn = asyncHandler(async (req, res) => {
  const result = momoService.verifyReturn(req.body);

  if (!result.isValid) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=false&message=Chữ+ký+không+hợp+lệ`);
  }

  const { data } = result;
  const isSuccess = data.resultCode === 0;

  if (isSuccess) {
    try {
      await updateOrderPayment(data.orderId, {
        paymentMethod: 'MOMO',
        paymentStatus: 'PAID',
        transactionNo: data.transId,
        transactionId: data.transId,
      });

      logger.info(`MoMo payment success: order ${data.orderId}, trans ${data.transId}`);

      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${data.orderId}?payment=success`
      );
    } catch (err) {
      logger.error(`MoMo update order error: ${err.message}`);
    }
  }

  return res.redirect(
    `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=${isSuccess}&message=${encodeURIComponent(data.message || '')}&orderId=${data.orderId}`
  );
});

// @desc    Xử lý IPN từ MoMo
// @route   POST /api/payments/momo/ipn
const momoIPN = asyncHandler(async (req, res) => {
  const result = momoService.processIPN(req.body);

  if (result.success && result.data) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: result.data.orderId },
        select: { paymentStatus: true, finalAmount: true },
      });

      if (!order) {
        return res.status(200).json({ error: 'Order not found' });
      }

      if (order.paymentStatus === 'PAID') {
        return res.status(204).send(); // Already confirmed
      }

      await updateOrderPayment(result.data.orderId, {
        paymentMethod: 'MOMO',
        paymentStatus: 'PAID',
        transactionNo: result.data.transId,
        transactionId: result.data.transId,
      });

      logger.info(`MoMo IPN processed: order ${result.data.orderId}`);
    } catch (err) {
      logger.error(`MoMo IPN error: ${err.message}`);
    }
  }

  // MoMo yêu cầu trả về 204 hoặc 200
  res.status(204).send();
});

// ═════════════════════════════════════════════════════════════
// Check payment status
// ═════════════════════════════════════════════════════════════

// @desc    Kiểm tra trạng thái thanh toán đơn hàng
// @route   GET /api/payments/status/:orderId
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentMethod: true,
      paymentStatus: true,
      transactionId: true,
      finalAmount: true,
      status: true,
      userId: true,
    },
  });

  if (!order) {
    throw new AppError('Đơn hàng không tồn tại', 404);
  }

  // Chỉ chủ đơn hàng hoặc admin mới xem được
  if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Bạn không có quyền xem thông tin này', 403);
  }

  res.json({
    success: true,
    data: order,
  });
});

module.exports = {
  createVNPayPayment,
  vnpayReturn,
  vnpayIPN,
  createMoMoPayment,
  momoReturn,
  momoIPN,
  getPaymentStatus,
};
