const { prisma } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
const asyncHandler = require('../utils/asyncHandler');
const mlService = require('../services/mlService');

// @desc    Get dashboard stats (cached 5 phút)
// @route   GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const cacheKey = 'dash:stats';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const [
    totalUsers,
    totalProducts,
    totalPartners,
    totalCategories,
    topProducts,
    clusterStats,
    mlHealth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'PARTNER', isApproved: true } }),
    prisma.category.count(),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { soldCount: 'desc' },
      take: 10,
      select: { id: true, name: true, images: true, price: true, soldCount: true, rating: true, stock: true },
    }),
    prisma.cluster.findMany({
      include: { _count: { select: { users: true } } },
    }),
    mlService.checkHealth().catch(() => false),
  ]);

  // Tính phần trăm phân bố khách hàng trong cluster
  const totalClusterUsers = clusterStats.reduce((sum, c) => sum + c._count.users, 0) || 1;

  const data = {
    overview: {
      totalUsers,
      totalProducts,
      totalPartners,
      totalCategories,
    },
    topProducts,
    clusterStats: clusterStats.map((c) => ({
      id: c.id, name: c.name, color: c.color,
      userCount: c._count.users,
      percentage: Math.round((c._count.users / totalClusterUsers) * 100),
    })),
    mlService: {
      healthy: mlHealth,
    },
  };

  await cacheSet(cacheKey, data, 300); // 5 phút
  res.json({ success: true, data });
});

// @desc    Get sales chart data (cached 5 phút)
// @route   GET /api/dashboard/sales-chart
const getSalesChart = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const cacheKey = `dash:sales:${days}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      status: 'DELIVERED',
    },
    select: { finalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const dailyData = {};
  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().split('T')[0];
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
    }
    dailyData[dateKey].revenue += order.finalAmount;
    dailyData[dateKey].orders += 1;
  }

  const data = Object.values(dailyData);
  await cacheSet(cacheKey, data, 300); // 5 phút
  res.json({ success: true, data });
});

// @desc    Get monthly revenue & orders for the year (cached 10 phút)
// @route   GET /api/dashboard/monthly-chart
const getMonthlyChart = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const cacheKey = `dash:monthly:${year}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    select: { finalAmount: true, status: true, createdAt: true },
  });

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenue: 0,
    orders: 0,
    cancelled: 0,
    revenueLost: 0,
  }));

  for (const order of orders) {
    const m = new Date(order.createdAt).getMonth();
    monthlyData[m].orders += 1;
    if (order.status === 'DELIVERED') {
      monthlyData[m].revenue += order.finalAmount;
    } else if (order.status === 'CANCELLED') {
      monthlyData[m].cancelled += 1;
      monthlyData[m].revenueLost += order.finalAmount;
    }
  }

  await cacheSet(cacheKey, monthlyData, 600); // 10 phút
  res.json({ success: true, data: monthlyData });
});

// @desc    Get products by category distribution (cached 10 phút)
// @route   GET /api/dashboard/category-chart
const getCategoryChart = asyncHandler(async (req, res) => {
  const cacheKey = 'dash:category';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  const total = categories.reduce((sum, c) => sum + c._count.products, 0) || 1;

  const colors = [
    '#4c6ef5', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    '#84cc16', '#06b6d4', '#d946ef', '#8b5cf6', '#22c55e',
  ];

  const data = categories.map((c, i) => ({
    id: c.id,
    name: c.name,
    count: c._count.products,
    percentage: Math.round((c._count.products / total) * 100),
    color: colors[i % colors.length],
  })).filter((c) => c.count > 0);

  await cacheSet(cacheKey, data, 600); // 10 phút
  res.json({ success: true, data });
});

// @desc    Get order status distribution (cached 5 phút)
// @route   GET /api/dashboard/order-status-chart
const getOrderStatusChart = asyncHandler(async (req, res) => {
  const cacheKey = 'dash:orderStatus';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const statuses = await prisma.order.groupBy({
    by: ['status'],
    _count: true,
  });

  const labels = {
    PENDING: { label: 'Chờ xử lý', color: '#f59e0b' },
    CONFIRMED: { label: 'Đã xác nhận', color: '#3b82f6' },
    SHIPPING: { label: 'Đang giao', color: '#8b5cf6' },
    DELIVERED: { label: 'Đã giao', color: '#10b981' },
    CANCELLED: { label: 'Đã huỷ', color: '#ef4444' },
  };

  const total = statuses.reduce((sum, s) => sum + s._count, 0) || 1;

  const data = statuses.map((s) => ({
    status: s.status,
    label: labels[s.status]?.label || s.status,
    count: s._count,
    percentage: Math.round((s._count / total) * 100),
    color: labels[s.status]?.color || '#6b7280',
  }));

  await cacheSet(cacheKey, data, 300); // 5 phút
  res.json({ success: true, data });
});

// @desc    Get user growth (monthly new users, cached 10 phút)
// @route   GET /api/dashboard/user-growth
const getUserGrowth = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const cacheKey = `dash:userGrowth:${year}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    select: { createdAt: true, role: true },
  });

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    customers: 0,
    partners: 0,
    total: 0,
  }));

  for (const user of users) {
    const m = new Date(user.createdAt).getMonth();
    monthlyData[m].total += 1;
    if (user.role === 'PARTNER') {
      monthlyData[m].partners += 1;
    } else if (user.role === 'CUSTOMER') {
      monthlyData[m].customers += 1;
    }
  }

  await cacheSet(cacheKey, monthlyData, 600); // 10 phút
  res.json({ success: true, data: monthlyData });
});

// @desc    Get recent orders for admin
// @route   GET /api/dashboard/recent-orders
const getRecentOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      orderItems: {
        take: 2,
        include: { product: { select: { name: true, images: true } } },
      },
    },
  });

  res.json({ success: true, data: orders });
});

module.exports = { getStats, getSalesChart, getMonthlyChart, getCategoryChart, getOrderStatusChart, getUserGrowth, getRecentOrders };
