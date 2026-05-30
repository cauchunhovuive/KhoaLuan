const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalProducts,
    totalPartners,
    totalCategories,
    topProducts,
    clusterStats,
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
  ]);

  // Tính phần trăm phân bố khách hàng trong cluster
  const totalClusterUsers = clusterStats.reduce((sum, c) => sum + c._count.users, 0) || 1;

  res.json({
    success: true,
    data: {
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
