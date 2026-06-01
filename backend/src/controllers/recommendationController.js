const { prisma } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
const asyncHandler = require('../utils/asyncHandler');
const mlService = require('../services/mlService');

// Helper: build order/product data for ML service (cached 5 phút)
const ML_DATA_CACHE_KEY = 'ml:buildData';

async function buildMLData() {
  const cached = await cacheGet(ML_DATA_CACHE_KEY);
  if (cached) return cached;

  const [orders, products] = await Promise.all([
    prisma.orderItem.findMany({
      take: 500,
      orderBy: { order: { createdAt: 'desc' } },
      select: {
        order: { select: { id: true, userId: true } },
        productId: true,
        quantity: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      take: 200,
    }),
  ]);

  const result = {
    orders: orders.map(o => ({
      user_id: o.order.userId,
      product_id: o.productId,
      quantity: o.quantity,
    })),
    products: products.map(p => ({ id: p.id, name: p.name })),
  };

  // Cache 5 phút — dữ liệu ML không cần real-time
  await cacheSet(ML_DATA_CACHE_KEY, result, 300);
  return result;
}

// @desc    Get personalized recommendations for user
// @route   GET /api/recommendations/personalized
const getPersonalizedRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `rec:personalized:${userId}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  let recommendedIds = [];

  // Try ML service first for CF-based recommendations
  try {
    const mlData = await buildMLData();
    const mlRecs = await mlService.getCFRecommendations(mlData.orders, mlData.products, userId, 10);
    if (mlRecs.length > 0) {
      recommendedIds = mlRecs.map(r => r.product_id);
    }
  } catch (e) {
    // ML failed, fall through to local logic
  }

  let products = [];

  if (recommendedIds.length > 0) {
    // Fetch product details for recommended IDs
    const recProducts = await prisma.product.findMany({
      where: { id: { in: recommendedIds }, isActive: true, stock: { gt: 0 } },
      select: {
        id: true, name: true, slug: true, price: true, discountPrice: true,
        images: true, rating: true, soldCount: true,
        category: { select: { id: true, name: true } },
        partner: { select: { id: true, storeName: true } },
      },
    });
    // Maintain ML sort order
    const productMap = new Map(recProducts.map(p => [p.id, p]));
    products = recommendedIds.map(id => productMap.get(id)).filter(Boolean);
  } else {
    // Fallback: Get user's cluster
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
