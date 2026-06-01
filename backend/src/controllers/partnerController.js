const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
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

// @desc    Get partner dashboard stats (cached 2 phút)
// @route   GET /api/partner/dashboard
const getPartnerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `partner:dash:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

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

  const data = {
    overview: {
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue._sum.price || 0,
      activeProducts,
    },
    recentOrders,
  };

  await cacheSet(cacheKey, data, 120); // 2 phút
  res.json({ success: true, data });
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

// @desc    Partner create product (self-managed, no admin approval needed)
// @route   POST /api/partner/products
const createPartnerProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discountPrice, images, stock, categoryId } = req.body;

  if (!req.user.isApproved) {
    throw new AppError('Tài khoản đối tác chưa được phê duyệt', 403);
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      price,
      discountPrice: discountPrice || null,
      images: images?.length ? images : ['https://picsum.photos/seed/default/400/400'],
      stock: stock || 0,
      categoryId,
      partnerId: req.user.id,
      isActive: true,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  await cacheDel('products:*');

  res.status(201).json({ success: true, data: product });
});

// @desc    Partner update product (own products only)
// @route   PUT /api/partner/products/:id
const updatePartnerProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { name, description, price, discountPrice, images, stock, categoryId, isActive } = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Sản phẩm không tồn tại', 404);
  if (existing.partnerId !== userId) throw new AppError('Bạn không có quyền sửa sản phẩm này', 403);

  const data = {};
  if (name) { data.name = name; data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  if (description !== undefined) data.description = description;
  if (price !== undefined) data.price = price;
  if (discountPrice !== undefined) data.discountPrice = discountPrice || null;
  if (images) data.images = images;
  if (stock !== undefined) data.stock = stock;
  if (categoryId) data.categoryId = categoryId;
  if (isActive !== undefined) data.isActive = isActive;

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true } } },
  });

  await cacheDel(`product:${id}`);

  res.json({ success: true, data: product });
});

// @desc    Partner delete/deactivate product (own products only)
// @route   DELETE /api/partner/products/:id
const deletePartnerProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Sản phẩm không tồn tại', 404);
  if (existing.partnerId !== userId) throw new AppError('Bạn không có quyền xoá sản phẩm này', 403);

  // Soft delete - just deactivate
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  await cacheDel(`product:${id}`);

  res.json({ success: true, message: 'Sản phẩm đã được ẩn' });
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

// @desc    Get partner revenue data for charts (cached 5 phút)
// @route   GET /api/partner/revenue
const getPartnerRevenue = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = 'monthly', year = new Date().getFullYear() } = req.query;
  const cacheKey = `partner:revenue:${userId}:${year}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const orders = await prisma.order.findMany({
    where: {
      orderItems: { some: { product: { partnerId: userId } } },
      status: 'DELIVERED',
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${parseInt(year) + 1}-01-01`),
      },
    },
    include: {
      orderItems: {
        where: { product: { partnerId: userId } },
        select: { price: true, quantity: true, product: { select: { name: true, images: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by month
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenue: 0,
    orders: 0,
  }));

  orders.forEach((order) => {
    const month = new Date(order.createdAt).getMonth();
    monthlyData[month].revenue += order.orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );
    monthlyData[month].orders += 1;
  });

  // Top selling products
  const productSales = {};
  orders.forEach((order) => {
    order.orderItems.forEach((item) => {
      const name = item.product.name;
      if (!productSales[name]) {
        productSales[name] = { name, quantity: 0, revenue: 0, image: item.product.images?.[0] };
      }
      productSales[name].quantity += item.quantity;
      productSales[name].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const data = {
    monthlyRevenue: monthlyData.filter((m) => m.orders > 0),
    topProducts,
    totalRevenue: orders.reduce(
      (sum, o) => sum + o.orderItems.reduce((s, i) => s + i.price * i.quantity, 0), 0
    ),
    totalOrders: orders.length,
  };

  await cacheSet(cacheKey, data, 300); // 5 phút
  res.json({ success: true, data });
});

module.exports = {
  registerPartner,
  getPartnerDashboard,
  getPartnerProducts,
  createPartnerProduct,
  updatePartnerProduct,
  deletePartnerProduct,
  getPartnerOrders,
  updatePartnerOrderStatus,
  updatePartnerProfile,
  getAllPartners,
  approvePartner,
  getPartnerRevenue,
};
