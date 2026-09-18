const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { applyCouponToOrder } = require('./couponController');

// ─── Helper: get active flash sale prices for a list of product IDs ───
const getFlashSalePrices = async (productIds) => {
  if (!productIds.length) return {};
  const now = new Date();
  const flashProducts = await prisma.flashSaleProduct.findMany({
    where: {
      productId: { in: productIds },
      flashSale: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
    select: {
      id: true,
      productId: true,
      salePrice: true,
      maxQuantity: true,
      soldCount: true,
      flashSale: { select: { id: true, title: true } },
    },
  });
  return flashProducts.reduce((map, fp) => {
    map[fp.productId] = fp;
    return map;
  }, {});
};

// @desc    Create order from cart
// @route   POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, phone, note, paymentMethod, couponCode } = req.body;
  const userId = req.user.id;

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });

  if (!cartItems.length) {
    throw new AppError('Giỏ hàng trống', 400);
  }

  // ── Lấy giá flash sale cho tất cả sản phẩm trong giỏ ──
  const productIds = cartItems.map((i) => i.productId);
  const flashPrices = await getFlashSalePrices(productIds);

  // ── Kiểm tra stock + flash sale ──
  for (const item of cartItems) {
    if (item.quantity > item.product.stock) {
      throw new AppError(`Sản phẩm "${item.product.name}" không đủ hàng`, 400);
    }

    const flashInfo = flashPrices[item.productId];
    if (flashInfo && flashInfo.maxQuantity > 0) {
      const remaining = flashInfo.maxQuantity - flashInfo.soldCount;
      if (item.quantity > remaining) {
        throw new AppError(
          `Sản phẩm "${item.product.name}" chỉ còn ${remaining} suất flash sale`,
          400
        );
      }
    }
  }

  // ── Tính subtotal — dùng flash sale price nếu có ──
  const getEffectivePrice = (item) => {
    const flashInfo = flashPrices[item.productId];
    return flashInfo ? flashInfo.salePrice : (item.product.discountPrice || item.product.price);
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + getEffectivePrice(item) * item.quantity,
    0
  );
  const shippingFee = subtotal >= 500000 ? 0 : 30000;

  // Apply coupon if provided
  let coupon = null;
  let discountAmount = 0;
  if (couponCode && couponCode.trim()) {
    try {
      const result = await applyCouponToOrder(couponCode, userId, subtotal);
      coupon = result.coupon;
      discountAmount = result.discountAmount;
    } catch (err) {
      throw new AppError(err.message, 400);
    }
  }

  const finalAmount = Math.max(0, subtotal + shippingFee - discountAmount);

  const order = await prisma.$transaction(async (tx) => {
    // Create order — dùng flash sale price
    const newOrder = await tx.order.create({
      data: {
        userId,
        totalAmount: subtotal,
        shippingFee,
        discountAmount,
        finalAmount,
        shippingAddress,
        phone,
        note,
        paymentMethod,
        couponId: coupon?.id || null,
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: getEffectivePrice(item),
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

      // ── Update flash sale soldCount ──
      const flashInfo = flashPrices[item.productId];
      if (flashInfo) {
        await tx.flashSaleProduct.update({
          where: { id: flashInfo.id },
          data: { soldCount: { increment: item.quantity } },
        });
      }
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

    // Record coupon usage
    if (coupon) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
      await tx.couponUsage.create({
        data: { couponId: coupon.id, userId, orderId: newOrder.id },
      });
    }

    return newOrder;
  });

  // Create notification for admin
  await prisma.notification.create({
    data: {
      type: 'ORDER',
      title: 'Đơn hàng mới',
      message: `Đơn hàng #${order.id.slice(0, 8)} - ${order.finalAmount.toLocaleString('vi-VN')}₫ từ ${req.user.name}${coupon ? ' (có mã giảm giá)' : ''}`,
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
        coupon: { select: { id: true, code: true, type: true, value: true } },
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
      user: { select: { id: true, name: true, phone: true, address: true } },
      orderItems: {
        include: {
          product: { select: { id: true, name: true, images: true, price: true, slug: true, partnerId: true } },
        },
      },
      coupon: { select: { id: true, code: true, type: true, value: true } },
    },
  });

  if (!order) throw new AppError('Đơn hàng không tồn tại', 404);

  // Cho phép: chủ đơn hàng, admin, hoặc partner có sản phẩm trong đơn
  const isOwner = order.userId === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';
  const isPartnerWithProducts = req.user.role === 'PARTNER' &&
    order.orderItems.some((item) => item.product.partnerId === req.user.id);

  if (!isOwner && !isAdmin && !isPartnerWithProducts) {
    throw new AppError('Bạn không có quyền xem đơn hàng này', 403);
  }

  res.json({ success: true, data: order });
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: true,
      coupon: { select: { id: true, code: true } },
    },
  });

  if (!order) throw new AppError('Đơn hàng không tồn tại', 404);
  if (order.userId !== req.user.id) throw new AppError('Bạn không có quyền hủy đơn hàng này', 403);
  if (order.status !== 'PENDING') throw new AppError('Chỉ có thể hủy đơn hàng đang chờ xử lý', 400);

  await prisma.$transaction(async (tx) => {
    // Hoàn lại tồn kho
    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
          soldCount: { decrement: item.quantity },
        },
      });
    }

    // Hoàn lại lượt dùng coupon (nếu có)
    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { decrement: 1 } },
      });
      // Xóa bản ghi coupon usage
      await tx.couponUsage.deleteMany({
        where: { couponId: order.couponId, orderId: id },
      });
    }

    // Cập nhật trạng thái đơn
    await tx.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  });

  // Thông báo cho admin
  await prisma.notification.create({
    data: {
      type: 'ORDER',
      title: 'Đơn hàng đã hủy',
      message: `Đơn hàng #${id.slice(0, 8)} đã bị hủy bởi khách hàng`,
      referenceId: id,
    },
  });

  const cancelled = await prisma.order.findUnique({
    where: { id },
    include: { orderItems: true },
  });
  res.json({ success: true, data: cancelled, message: 'Đã hủy đơn hàng thành công' });
});

// @desc    Update order status (Admin/Partner)
// @route   PUT /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const existing = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: { include: { product: { select: { partnerId: true } } } },
      coupon: { select: { id: true, code: true } },
    },
  });

  if (!existing) throw new AppError('Đơn hàng không tồn tại', 404);

  // Partner chỉ có thể cập nhật đơn hàng có chứa sản phẩm của họ
  if (req.user.role === 'PARTNER') {
    const hasMyProduct = existing.orderItems.some((item) => item.product.partnerId === req.user.id);
    if (!hasMyProduct) {
      throw new AppError('Đơn hàng không chứa sản phẩm của bạn', 403);
    }
    const partnerAllowed = ['CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
    if (!partnerAllowed.includes(status)) {
      throw new AppError('Bạn không thể chuyển đơn hàng sang trạng thái này', 400);
    }

    // Nếu partner từ chối đơn → CANCELLED + hoàn tồn kho (tất cả sản phẩm)
    if (status === 'CANCELLED') {
      await prisma.$transaction(async (tx) => {
        // Hoàn lại tồn kho cho TẤT CẢ sản phẩm trong đơn
        for (const item of existing.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              soldCount: { decrement: item.quantity },
            },
          });
        }

        // Hoàn coupon — toàn bộ đơn bị hủy nên coupon luôn được hoàn
        if (existing.couponId) {
          await tx.coupon.update({
            where: { id: existing.couponId },
            data: { usedCount: { decrement: 1 } },
          });
          await tx.couponUsage.deleteMany({
            where: { couponId: existing.couponId, orderId: id },
          });
        }

        await tx.order.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });
      });

      // Thông báo cho khách hàng
      await prisma.notification.create({
        data: {
          type: 'ORDER',
          title: 'Đơn hàng bị từ chối',
          message: `Đơn hàng #${id.slice(0, 8)} đã bị đối tác từ chối. Tiền sẽ được hoàn lại trong 1-3 ngày làm việc.`,
          referenceId: id,
        },
      });

      const order = await prisma.order.findUnique({
        where: { id },
        include: { orderItems: true },
      });
      return res.json({ success: true, data: order, message: 'Đã từ chối đơn hàng' });
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: { orderItems: true },
  });

  // Mark notification as read
  if (status !== 'PENDING') {
    await prisma.notification.updateMany({
      where: { referenceId: id, type: 'ORDER', isRead: false },
      data: { isRead: true },
    });
  }

  // Gửi thông báo cho khách hàng khi trạng thái đơn thay đổi
  if (['CONFIRMED', 'SHIPPING', 'DELIVERED'].includes(status)) {
    const statusLabels = {
      CONFIRMED: 'đã được xác nhận',
      SHIPPING: 'đang được giao',
      DELIVERED: 'đã giao thành công',
    };
    await prisma.notification.create({
      data: {
        type: 'ORDER',
        title: 'Cập nhật đơn hàng',
        message: `Đơn hàng #${id.slice(0, 8)} ${statusLabels[status] || status}.`,
        referenceId: id,
      },
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
        coupon: { select: { id: true, code: true, type: true, value: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: { orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } },
  });
});

// @desc    Confirm delivery (User)
// @route   PUT /api/orders/:id/confirm
const confirmDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) throw new AppError('Đơn hàng không tồn tại', 404);
  if (order.userId !== req.user.id) throw new AppError('Bạn không có quyền xác nhận đơn này', 403);
  if (order.status !== 'SHIPPING') throw new AppError('Đơn hàng chưa được giao', 400);

  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'DELIVERED' },
  });

  res.json({ success: true, data: updated });
});

// @desc    Re-buy (User purchases same items from a previous order)
// @route   POST /api/orders/:id/rebuy
const reBuy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { orderItems: { include: { product: true } } },
  });

  if (!order) throw new AppError('Đơn hàng không tồn tại', 404);
  if (order.userId !== req.user.id) throw new AppError('Bạn không có quyền mua lại đơn này', 403);

  // Add items back to cart
  for (const item of order.orderItems) {
    if (item.product.isActive && item.product.stock > 0) {
      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: req.user.id, productId: item.productId } },
      });
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(existing.quantity + item.quantity, item.product.stock) },
        });
      } else {
        await prisma.cartItem.create({
          data: { userId: req.user.id, productId: item.productId, quantity: Math.min(item.quantity, item.product.stock) },
        });
      }
    }
  }

  res.json({ success: true, message: 'Sản phẩm đã được thêm vào giỏ hàng' });
});

module.exports = { createOrder, getMyOrders, getOrder, cancelOrder, updateOrderStatus, getAllOrders, confirmDelivery, reBuy };
