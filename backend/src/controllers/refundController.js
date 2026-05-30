const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('./auditController');

// ─── USER: Create refund request ───
const createRefund = asyncHandler(async (req, res) => {
  const { orderId, reason, description, images, amount } = req.body;
  const userId = req.user.id;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('Đơn hàng không tồn tại', 404);
  if (order.userId !== userId) throw new AppError('Bạn không có quyền yêu cầu hoàn tiền cho đơn này', 403);
  if (order.status !== 'DELIVERED') throw new AppError('Chỉ có thể yêu cầu hoàn tiền cho đơn đã giao', 400);

  // Check if refund already exists
  const existing = await prisma.refund.findFirst({ where: { orderId, userId } });
  if (existing) throw new AppError('Bạn đã gửi yêu cầu hoàn tiền cho đơn này rồi', 400);

  const refund = await prisma.refund.create({
    data: {
      orderId, userId,
      reason: reason || 'Không hài lòng với sản phẩm',
      description, images: images || [],
      amount: amount || order.finalAmount,
    },
  });

  // Notify admin
  await prisma.notification.create({
    data: {
      type: 'SYSTEM',
      title: 'Yêu cầu hoàn tiền mới',
      message: `Đơn hàng #${orderId.slice(0, 8)} - ${req.user.name} yêu cầu hoàn ${(amount || order.finalAmount).toLocaleString('vi-VN')}₫`,
      referenceId: refund.id,
    },
  });

  res.status(201).json({ success: true, data: refund });
});

// ─── USER: Get my refunds ───
const getMyRefunds = asyncHandler(async (req, res) => {
  const refunds = await prisma.refund.findMany({
    where: { userId: req.user.id },
    include: { order: { select: { id: true, finalAmount: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: refunds });
});

// ─── ADMIN: Get all refunds ───
const getAllRefunds = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const where = {};
  if (status) where.status = status;

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, finalAmount: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.refund.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      refunds,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    },
  });
});

// ─── ADMIN: Update refund status ───
const updateRefundStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminReply } = req.body;

  const refund = await prisma.refund.findUnique({ where: { id } });
  if (!refund) throw new AppError('Yêu cầu hoàn tiền không tồn tại', 404);

  const data = { status, resolvedAt: new Date() };
  if (adminReply !== undefined) data.adminReply = adminReply;

  const updated = await prisma.refund.update({ where: { id }, data });

  // If approved/refunded, update payment status
  if (status === 'REFUNDED') {
    await prisma.order.update({
      where: { id: refund.orderId },
      data: { paymentStatus: 'REFUNDED' },
    });
  }

  logAction(req.user.id, 'UPDATE', 'REFUND', id, { status });
  res.json({ success: true, data: updated });
});

module.exports = { createRefund, getMyRefunds, getAllRefunds, updateRefundStatus };
