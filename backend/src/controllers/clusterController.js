const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const mlService = require('../services/mlService');

// @desc    Get all clusters
// @route   GET /api/clusters
const getClusters = asyncHandler(async (req, res) => {
  const clusters = await prisma.cluster.findMany({
    include: {
      _count: { select: { users: true } },
      clusterRules: { orderBy: { priority: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: clusters });
});

// @desc    Get cluster by ID
// @route   GET /api/clusters/:id
const getCluster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cluster = await prisma.cluster.findUnique({
    where: { id },
    include: {
      clusterRules: { orderBy: { priority: 'asc' } },
      users: {
        select: { id: true, name: true, email: true, totalSpent: true, orderCount: true },
        orderBy: { totalSpent: 'desc' },
        take: 20,
      },
    },
  });

  if (!cluster) throw new AppError('Nhóm khách hàng không tồn tại', 404);
  res.json({ success: true, data: cluster });
});

// @desc    Create cluster (Admin)
// @route   POST /api/clusters
const createCluster = asyncHandler(async (req, res) => {
  const { name, description, color, rules } = req.body;

  const cluster = await prisma.cluster.create({
    data: {
      name,
      description,
      color,
      clusterRules: rules ? {
        create: rules.map((rule, index) => ({
          metricName: rule.metricName,
          minValue: rule.minValue,
          maxValue: rule.maxValue,
          priority: index,
        })),
      } : undefined,
    },
    include: { clusterRules: true },
  });

  res.status(201).json({ success: true, data: cluster });
});

// @desc    Update cluster (Admin)
// @route   PUT /api/clusters/:id
const updateCluster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, color } = req.body;

  const data = {};
  if (name) data.name = name;
  if (description !== undefined) data.description = description;
  if (color) data.color = color;

  const cluster = await prisma.cluster.update({
    where: { id },
    data,
    include: { clusterRules: true },
  });

  res.json({ success: true, data: cluster });
});

// @desc    Delete cluster (Admin)
// @route   DELETE /api/clusters/:id
const deleteCluster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.clusterRule.deleteMany({ where: { clusterId: id } });
  await prisma.cluster.delete({ where: { id } });
  res.json({ success: true, message: 'Nhóm khách hàng đã được xóa' });
});

// @desc    Run clustering (Admin) - calls ML service
// @route   POST /api/clusters/run
const runClustering = asyncHandler(async (req, res) => {
  // Fetch orders from database to send to ML service
  const orders = await prisma.order.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: {
      userId: true,
      finalAmount: true,
      createdAt: true,
    },
  });

  const ordersData = orders.map((o) => ({
    user_id: o.userId,
    total_amount: o.finalAmount,
    created_at: o.createdAt.toISOString(),
  }));

  // Use mlService to trigger clustering
  const result = await mlService.runClustering(ordersData);
  if (!result.success) {
    throw new AppError('Phân cụm thất bại: ' + (result.detail || 'Lỗi ML service'), 500);
  }

  // Update user clusters based on ML result
  if (result.data?.clusters) {
    for (const cluster of result.data.clusters) {
      // Find or create cluster in DB
      let dbCluster = await prisma.cluster.findFirst({
        where: { name: cluster.name },
      });

      if (!dbCluster) {
        dbCluster = await prisma.cluster.create({
          data: {
            name: cluster.name,
            description: cluster.description,
            color: cluster.color,
          },
        });
      }

      // Update users in this cluster
      for (const clusterUser of cluster.users) {
        await prisma.user.update({
          where: { id: clusterUser.user_id },
          data: { clusterId: dbCluster.id },
        });
      }
    }
  }

  res.json({
    success: true,
    data: { message: 'Phân cụm hoàn tất', result: result.data },
  });
});

// @desc    Get cluster statistics (enhanced with ML profiles)
// @route   GET /api/clusters/stats
const getClusterStats = asyncHandler(async (req, res) => {
  const clusters = await prisma.cluster.findMany({
    include: {
      _count: { select: { users: true } },
    },
  });

  const totalUsers = clusters.reduce((sum, c) => sum + c._count.users, 0);

  // Try to get ML cluster profiles for additional metadata
  let mlProfiles = [];
  try {
    mlProfiles = await mlService.getClusterProfiles();
  } catch (e) {
    // ML not available
  }

  const mlProfileMap = new Map(mlProfiles.map(p => [p.id, p]));

  const stats = clusters.map((c, idx) => {
    const mlProfile = mlProfileMap.get(idx) || {};
    return {
      id: c.id,
      name: c.name,
      color: c.color || mlProfile.color,
      description: mlProfile.description || '',
      userCount: c._count.users,
      percentage: totalUsers ? ((c._count.users / totalUsers) * 100).toFixed(1) : 0,
      rfmProfile: mlProfile.rfm_scores || null,
    };
  });

  res.json({ success: true, data: { clusters: stats, totalUsers, mlConnected: mlProfiles.length > 0 } });
});

// @desc    Get ML cluster profiles
// @route   GET /api/clusters/ml-profiles
const getMLClusterProfiles = asyncHandler(async (req, res) => {
  const profiles = await mlService.getClusterProfiles();
  const stats = await mlService.getClusterStats();
  res.json({
    success: true,
    data: {
      profiles,
      stats,
      healthy: true,
    },
  });
});

module.exports = { getClusters, getCluster, createCluster, updateCluster, deleteCluster, runClustering, getClusterStats, getMLClusterProfiles };
