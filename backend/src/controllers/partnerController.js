const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

// @desc    Register as partner
// @route   POST /api/partner/register
const registerPartner = asyncHandler(async (req, res) => {
  const { email, password, name, phone, storeName, storeDescription, taxCode, businessAddress } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email đã được đăng ký', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      phone,
      storeName,
      storeDescription,
      taxCode,
      businessAddress,
      role: 'PARTNER',
      isApproved: false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      storeName: true,
      storeDescription: true,
      taxCode: true,
      businessAddress: true,
      role: true,
      isApproved: true,
      createdAt: true,
    },
  });

  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  // Notify admin about new partner registration
  await prisma.notification.create({
    data: {
      type: 'SYSTEM',
      title: 'Đối tác mới đăng ký',
      message: `${storeName || name} đã đăng ký làm đối tác và đang chờ phê duyệt`,
      referenceId: user.id,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
      refreshToken,
      message: 'Đăng ký đối tác thành công! Vui lòng chờ Admin phê duyệt.',
    },
  });
});

// @desc    Get partner dashboard stats
// @route   GET /api/partner/dashboard
const getPartnerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [totalProducts, totalOrders, totalRevenue, activeProducts, recentOrders] = await Promise.all([
    prisma.product.count({ where: { partnerId: userId } }),
    prisma.orderItem.count({
      where: { product: { partnerId: userId } },
    }),
    prisma.orderItem.aggregate({
      _sum: { price: true },
      where: {
        product: { partnerId: userId },
        order: { status: 'DELIVERED' },
      },
    }),
    prisma.product.count({ where: { partnerId: userId, isActive: true } }),
    prisma.orderItem.findMany({
      where: { product: { partnerId: userId } },
      include: {
        order: {
          select: { id: true, status: true, finalAmount: true, createdAt: true, user: { select: { name: true } } },
        },
        product: { select: { name: true, images: true } },
      },
      orderBy: { order: { createdAt: 'desc' } },
      take: 10,
    }),
  ]);

  // Đếm số đơn theo từng trạng thái cho sản phẩm của partner
  const orderStatusStats = await prisma.orderItem.groupBy({
    by: ['orderId'],
    where: { product: { partnerId: userId } },
  });
  const orderIds = orderStatusStats.map((o) => o.orderId);
  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    where: { id: { in: orderIds } },
    _count: true,
  });

  res.json({
    success: true,
    data: {
      overview: {
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.price || 0,
        activeProducts,
      },
      orderStatusStats: statusCounts.map((s) => ({ status: s.status, count: s._count })),
      recentOrders,
    },
  });
});

// @desc    Get partner's products
// @route   GET /api/partner/products
const getPartnerProducts = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { partnerId: userId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.product.count({ where: { partnerId: userId } }),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Get partner's orders (orders containing their products)
// @route   GET /api/partner/orders
const getPartnerOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;

  const orderItems = await prisma.orderItem.findMany({
    where: {
      product: { partnerId: userId },
      ...(status ? { order: { status } } : {}),
    },
    select: { orderId: true },
    distinct: ['orderId'],
  });
  const orderIds = orderItems.map((o) => o.orderId);

  const where = { id: { in: orderIds } };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, address: true } },
        orderItems: {
          where: { product: { partnerId: userId } },
          include: { product: { select: { id: true, name: true, images: true, price: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Update order status (Partner - only for orders with their products)
// @route   PUT /api/partner/orders/:id/status
const updatePartnerOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  // Kiểm tra đơn hàng có chứa sản phẩm của partner không
  const orderItem = await prisma.orderItem.findFirst({
    where: { orderId: id, product: { partnerId: userId } },
  });

  if (!orderItem) {
    throw new AppError('Đơn hàng không chứa sản phẩm của bạn', 403);
  }

  const validStatuses = ['CONFIRMED', 'SHIPPING', 'DELIVERED'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Trạng thái không hợp lệ', 400);
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      orderItems: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });

  res.json({ success: true, data: order });
});

// @desc    Admin: Get all partners
// @route   GET /api/partner/admin/all
const getAllPartners = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isApproved, search } = req.query;
  const where = { role: 'PARTNER' };

  if (isApproved !== undefined) where.isApproved = isApproved === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { storeName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [partners, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        storeName: true,
        storeDescription: true,
        taxCode: true,
        businessAddress: true,
        isApproved: true,
        approvedAt: true,
        rejectedReason: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      partners,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Admin: Approve/reject partner
// @route   PUT /api/partner/admin/:id/approve
const approvePartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approved, rejectedReason } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== 'PARTNER') {
    throw new AppError('Không tìm thấy đối tác', 404);
  }

  const data = {};
  if (approved) {
    data.isApproved = true;
    data.approvedAt = new Date();
    data.rejectedReason = null;
  } else {
    data.isApproved = false;
    data.approvedAt = null;
    data.rejectedReason = rejectedReason || 'Không được phê duyệt';
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      storeName: true,
      isApproved: true,
      approvedAt: true,
      rejectedReason: true,
    },
  });

  const statusText = approved ? 'đã được phê duyệt' : 'bị từ chối';
  await prisma.notification.create({
    data: {
      type: 'SYSTEM',
      title: 'Cập nhật trạng thái đối tác',
      message: `Tài khoản đối tác ${updated.storeName || updated.name} ${statusText}`,
      referenceId: id,
    },
  });

  res.json({ success: true, data: updated });
});

// @desc    Update partner profile (store info)
// @route   PUT /api/partner/profile
const updatePartnerProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { storeName, storeDescription, taxCode, businessAddress, phone } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(storeName !== undefined && { storeName }),
      ...(storeDescription !== undefined && { storeDescription }),
      ...(taxCode !== undefined && { taxCode }),
      ...(businessAddress !== undefined && { businessAddress }),
      ...(phone !== undefined && { phone }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      storeName: true,
      storeDescription: true,
      taxCode: true,
      businessAddress: true,
      isApproved: true,
      approvedAt: true,
    },
  });

  res.json({ success: true, data: user });
});

module.exports = {
  registerPartner,
  getPartnerDashboard,
  getPartnerProducts,
  getPartnerOrders,
  updatePartnerOrderStatus,
  updatePartnerProfile,
  getAllPartners,
  approvePartner,
};
