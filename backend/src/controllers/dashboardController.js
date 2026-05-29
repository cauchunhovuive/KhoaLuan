const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue,
    monthlyOrders,
    monthlyRevenue,
    yearlyRevenue,
    recentOrders,
    topProducts,
    orderStatusStats,
    clusterStats,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { finalAmount: true }, where: { status: 'DELIVERED' } }),
    prisma.order.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
    prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: { createdAt: { gte: firstDayOfMonth }, status: 'DELIVERED' },
    }),
    prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: { createdAt: { gte: firstDayOfYear }, status: 'DELIVERED' },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, name: true } },
        orderItems: { include: { product: { select: { name: true } } }, take: 3 },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { soldCount: 'desc' },
      take: 10,
      select: { id: true, name: true, images: true, price: true, soldCount: true, rating: true, stock: true },
    }),
    prisma.order.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.cluster.findMany({
      include: { _count: { select: { users: true } } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.finalAmount || 0,
        monthlyOrders,
        monthlyRevenue: monthlyRevenue._sum.finalAmount || 0,
        yearlyRevenue: yearlyRevenue._sum.finalAmount || 0,
      },
      recentOrders,
      topProducts,
      orderStatusStats: orderStatusStats.map((s) => ({ status: s.status, count: s._count })),
      clusterStats: clusterStats.map((c) => ({ id: c.id, name: c.name, color: c.color, userCount: c._count.users })),
    },
  });
});

// @desc    Get sales chart data
// @route   GET /api/dashboard/sales-chart
const getSalesChart = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
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

  res.json({ success: true, data: Object.values(dailyData) });
});

module.exports = { getStats, getSalesChart };
