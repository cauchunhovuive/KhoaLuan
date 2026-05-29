const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create order from cart
// @route   POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, phone, note, paymentMethod } = req.body;
  const userId = req.user.id;

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });

  if (!cartItems.length) {
    throw new AppError('Giỏ hàng trống', 400);
  }

  // Check stock
  for (const item of cartItems) {
    if (item.quantity > item.product.stock) {
      throw new AppError(`Sản phẩm "${item.product.name}" không đủ hàng`, 400);
    }
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const finalAmount = subtotal + shippingFee;

  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        userId,
        totalAmount: subtotal,
        shippingFee,
        finalAmount,
        shippingAddress,
        phone,
        note,
        paymentMethod,
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
      include: { orderItems: { include: { product: true } } },
    });

    // Update stock & sold count
    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          soldCount: { increment: item.quantity },
        },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { userId } });

    // Update user stats
    await tx.user.update({
      where: { id: userId },
      data: {
        totalSpent: { increment: finalAmount },
        orderCount: { increment: 1 },
        lastPurchaseAt: new Date(),
      },
    });

    return newOrder;
  });

  // Create notification for admin
  await prisma.notification.create({
    data: {
      type: 'ORDER',
      title: 'Đơn hàng mới',
      message: `Đơn hàng #${order.id.slice(0, 8)} - ${order.finalAmount.toLocaleString('vi-VN')}₫ từ ${req.user.name}`,
      referenceId: order.id,
    },
  });

  res.status(201).json({ success: true, data: order });
});

// @desc    Get user's orders
// @route   GET /api/orders
const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const userId = req.user.id;
  const where = { userId };

  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        orderItems: {
          include: {
            product: { select: { id: true, name: true, images: true, slug: true } },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: { orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } },
  });
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: {
          product: { select: { id: true, name: true, images: true, price: true, slug: true } },
        },
      },
    },
  });

  if (!order) throw new AppError('Đơn hàng không tồn tại', 404);
  if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Bạn không có quyền xem đơn hàng này', 403);
  }

  res.json({ success: true, data: order });
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) throw new AppError('Đơn hàng không tồn tại', 404);
  if (order.userId !== req.user.id) throw new AppError('Bạn không có quyền hủy đơn hàng này', 403);
  if (order.status !== 'PENDING') throw new AppError('Chỉ có thể hủy đơn hàng đang chờ xử lý', 400);

  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  res.json({ success: true, data: updated });
});

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: { orderItems: true },
  });

  // Mark notification as read when admin updates order status (from PENDING)
  if (status !== 'PENDING') {
    await prisma.notification.updateMany({
      where: { referenceId: id, type: 'ORDER', isRead: false },
      data: { isRead: true },
    });
  }

  res.json({ success: true, data: order });
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, userId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: {
          include: { product: { select: { id: true, name: true, images: true } } },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: { orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } },
  });
});

module.exports = { createOrder, getMyOrders, getOrder, cancelOrder, updateOrderStatus, getAllOrders };
