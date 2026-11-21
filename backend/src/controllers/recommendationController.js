const { prisma } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get personalized recommendations for user
// @route   GET /api/recommendations/personalized
const getPersonalizedRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `rec:personalized:${userId}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  let products = [];

  {
    // Primary: gợi ý theo cluster KMeans của user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clusterId: true },
    });

    if (user?.clusterId) {
      const clusterUsers = await prisma.user.findMany({
        where: { clusterId: user.clusterId },
        select: { id: true },
      });
      const userIds = clusterUsers.map((u) => u.id);

      if (userIds.length > 0) {
        const clusterOrders = await prisma.orderItem.findMany({
          where: { order: { userId: { in: userIds }, status: { not: 'CANCELLED' } } },
          include: {
            product: { select: { id: true, name: true, slug: true, price: true, discountPrice: true, images: true, rating: true, soldCount: true } },
          },
          orderBy: { order: { createdAt: 'desc' } },
          take: 20,
        });

        const productMap = new Map();
        for (const item of clusterOrders) {
          if (!productMap.has(item.product.id)) {
            productMap.set(item.product.id, { ...item.product, score: 0 });
          }
          productMap.get(item.product.id).score += item.quantity;
        }
        products = Array.from(productMap.values()).sort((a, b) => b.score - a.score).slice(0, 10);
      }
    }
  }

  // Fallback: popular products
  if (products.length < 10) {
    const existingIds = new Set(products.map((p) => p.id));
    const popular = await prisma.product.findMany({
      where: {
        isActive: true, stock: { gt: 0 },
        id: { notIn: [...existingIds] },
      },
      orderBy: [{ soldCount: 'desc' }, { rating: 'desc' }],
      take: 10 - products.length,
      select: { id: true, name: true, slug: true, price: true, discountPrice: true, images: true, rating: true, soldCount: true },
    });
    products.push(...popular);
  }

  await cacheSet(cacheKey, { recommendations: products.slice(0, 10) }, 600);

  res.json({ success: true, data: { recommendations: products.slice(0, 10) } });
});

// @desc    Get similar products (ML-enhanced, cached)
// @route   GET /api/recommendations/similar/:productId
const getSimilarProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cacheKey = `rec:similar:${productId}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, id: true, name: true },
  });

  if (!product) {
    return res.json({ success: true, data: [] });
  }

  // Không gọi ML — dùng category-based fallback trực tiếp, nhanh hơn nhiều
  const similar = await prisma.product.findMany({
    where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true, stock: { gt: 0 } },
    orderBy: [{ soldCount: 'desc' }, { rating: 'desc' }],
    take: 8,
    select: { id: true, name: true, slug: true, price: true, discountPrice: true, images: true, rating: true, soldCount: true },
  });

  // Cache 10 phút — sản phẩm tương tự không đổi thường xuyên
  await cacheSet(cacheKey, similar, 600);
  res.json({ success: true, data: similar });
});

// @desc    Get trending products
// @route   GET /api/recommendations/trending
const getTrendingProducts = asyncHandler(async (req, res) => {
  const cached = await cacheGet('rec:trending');
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const products = await prisma.product.findMany({
    where: { isActive: true, stock: { gt: 0 } },
    orderBy: [{ soldCount: 'desc' }, { rating: 'desc' }],
    take: 12,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      discountPrice: true,
      images: true,
      rating: true,
      soldCount: true,
      category: { select: { id: true, name: true } },
    },
  });

  await cacheSet('rec:trending', products, 300);
  res.json({ success: true, data: products });
});

// @desc    Get recommendations by cluster (Admin)
// @route   GET /api/recommendations/cluster/:clusterId
const getClusterRecommendations = asyncHandler(async (req, res) => {
  const { clusterId } = req.params;

  // Get top products purchased by users in this cluster
  const clusterUsers = await prisma.user.findMany({
    where: { clusterId },
    select: { id: true },
  });

  const userIds = clusterUsers.map((u) => u.id);

  if (userIds.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const orderItems = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        userId: { in: userIds },
        status: { not: 'CANCELLED' },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 20,
  });

  const productIds = orderItems.map((o) => o.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true, price: true, discountPrice: true, images: true, rating: true },
  });

  res.json({ success: true, data: products });
});

module.exports = { getPersonalizedRecommendations, getSimilarProducts, getTrendingProducts, getClusterRecommendations };
