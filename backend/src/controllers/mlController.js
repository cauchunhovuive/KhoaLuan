const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const mlService = require('../services/mlService');

// ============================================================
// Session-Based Recommendations
// ============================================================

// @desc    Get session-based recommendations for a user's current browsing
// @route   POST /api/ml/session/recommend
const getSessionRecommendations = asyncHandler(async (req, res) => {
  const { sessionItems, topN = 10, strategy = 'hybrid' } = req.body;

  if (!sessionItems || !sessionItems.length) {
    return res.json({ success: true, data: [] });
  }

  // Build product data for ML service
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    take: 200,
  });

  // Try to get view logs for training (if ProductView model exists)
  let recentViews = [];
  try {
    if (prisma.productView) {
      recentViews = await prisma.productView.findMany({
        take: 1000,
        orderBy: { createdAt: 'desc' },
        select: { userId: true, productId: true, createdAt: true },
      });
    }
  } catch (e) {
    // ProductView model may not exist yet
  }

  // Auto-train session model nếu có view logs (idempotent — ML service bỏ qua nếu đã train)
  if (recentViews.length > 0) {
    try {
      await mlService.callML('/session/train', 'POST', {
        view_logs: recentViews.map(v => ({
          user_id: v.userId,
          product_id: v.productId,
          timestamp: v.createdAt.toISOString(),
        })),
      });
    } catch (_) {
      // Train thất bại — vẫn tiếp tục recommend
    }
  }

  // Call ML service for session-based recommendations
  let recommendations = [];
  try {
    const result = await mlService.callML('/session/recommend', 'POST', {
      session_items: sessionItems,
      view_logs: recentViews.length > 0 ? recentViews.map(v => ({
        user_id: v.userId,
        product_id: v.productId,
        timestamp: v.createdAt.toISOString(),
      })) : undefined,
      products: products.map(p => ({ id: p.id, name: p.name })),
      top_n: topN,
      strategy,
    });

    if (result.success) {
      recommendations = result.data?.recommendations || [];
    }
  } catch (e) {
    // ML failed
  }

  let recommendedProducts = [];
  if (recommendations.length > 0) {
    const ids = recommendations.map(r => r.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: {
        id: true, name: true, slug: true, price: true, discountPrice: true,
        images: true, rating: true, soldCount: true,
        category: { select: { id: true, name: true } },
        partner: { select: { id: true, storeName: true } },
      },
    });
    const productMap = new Map(products.map(p => [p.id, p]));
    recommendedProducts = ids.map(id => productMap.get(id)).filter(Boolean);
  }

  res.json({ success: true, data: recommendedProducts });
});

// @desc    Train session model with recent view logs
// @route   POST /api/ml/session/train
const trainSessionModel = asyncHandler(async (req, res) => {
  let recentViews = [];
  try {
    if (prisma.productView) {
      recentViews = await prisma.productView.findMany({
        take: 5000,
        orderBy: { createdAt: 'desc' },
        select: { userId: true, productId: true, createdAt: true },
      });
    }
  } catch (e) {
    // ProductView model may not exist yet
  }

  if (recentViews.length === 0) {
    return res.json({ success: true, data: { message: 'Chưa có dữ liệu lượt xem sản phẩm. Hãy truy cập trang sản phẩm để thu thập dữ liệu.', trained: false } });
  }

  const result = await mlService.callML('/session/train', 'POST', {
    view_logs: recentViews.map(v => ({
      user_id: v.userId,
      product_id: v.productId,
      timestamp: v.createdAt.toISOString(),
    })),
  });

  res.json({
    success: true,
    data: {
      message: 'Session model trained',
      n_views: recentViews.length,
      trained: result.success,
    },
  });
});

// ============================================================
// Collaborative Filtering — Train & Explain
// ============================================================

/**
 * Helper: fetch order + product data for CF training
 */
async function getCFTrainingData() {
  const [orders, products] = await Promise.all([
    prisma.orderItem.findMany({
      take: 2000,
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
      take: 500,
    }),
  ]);
  return { orders, products };
}

/**
 * Helper: build CF data payload for ML service
 */
function buildCFPayload(orders, products) {
  return {
    orders: orders.map(o => ({
      user_id: o.order?.userId || o.user_id,
      product_id: o.productId || o.product_id,
      quantity: o.quantity || 1,
    })),
    products: products.map(p => ({ id: p.id, name: p.name })),
  };
}

// @desc    Train CF models (Item-Item, User-User, ALS, Hybrid)
// @route   POST /api/ml/cf/train
const trainCFModel = asyncHandler(async (req, res) => {
  const { orders, products } = await getCFTrainingData();

  if (orders.length < 5) {
    return res.json({
      success: true,
      data: { message: 'Không đủ dữ liệu để train CF (cần ít nhất 5 đơn hàng).', trained: false },
    });
  }

  const result = await mlService.callML('/cf/train', 'POST', buildCFPayload(orders, products));

  res.json({
    success: true,
    data: {
      message: result.data?.message || 'CF models trained',
      trained: result.success,
      n_orders: result.data?.n_orders || orders.length,
      n_products: result.data?.n_products || products.length,
      models: result.data?.models || [],
    },
  });
});

// @desc    Explain ML recommendations for a user (auto-trains CF first)
// @route   POST /api/ml/explain
const explainRecommendations = asyncHandler(async (req, res) => {
  const { userId, topN = 10 } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'Thiếu userId' });
  }

  const { orders, products } = await getCFTrainingData();

  if (orders.length === 0) {
    return res.json({ success: true, data: { recommendations: [], weights: {} } });
  }

  // Auto-train CF model before explaining
  const trainResult = await mlService.callML('/cf/train', 'POST', buildCFPayload(orders, products));
  if (!trainResult.success) {
    return res.json({ success: true, data: { recommendations: [], weights: {}, error: 'CF training failed' } });
  }

  const result = await mlService.callML('/cf/explain', 'POST', {
    user_id: userId,
    orders: orders.map(o => ({
      user_id: o.order?.userId || o.user_id,
      product_id: o.productId || o.product_id,
      quantity: o.quantity || 1,
    })),
    products: products.map(p => ({ id: p.id, name: p.name })),
    top_n: topN,
  });

  res.json(result);
});

// ============================================================
// Offline Evaluation
// ============================================================

// @desc    Run offline evaluation of recommendation models
// @route   POST /api/ml/evaluate
const evaluateModels = asyncHandler(async (req, res) => {
  const { topN = 10 } = req.body;

  // Build order and product data
  const [orders, products] = await Promise.all([
    prisma.orderItem.findMany({
      take: 1000,
      orderBy: { order: { createdAt: 'desc' } },
      select: {
        order: { select: { id: true, userId: true, createdAt: true } },
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

  if (orders.length < 10) {
    return res.json({
      success: true,
      data: { message: 'Không đủ dữ liệu để đánh giá (cần ít nhất 10 đơn hàng)' },
    });
  }

  const result = await mlService.callML('/evaluate/offline', 'POST', {
    orders: orders.map(o => ({
      user_id: o.order.userId,
      product_id: o.productId,
      quantity: o.quantity,
      created_at: o.order.createdAt?.toISOString() || '2024-01-01',
    })),
    products: products.map(p => ({ id: p.id, name: p.name })),
    top_n: topN,
  });

  res.json(result);
});

// ============================================================
// A/B Testing
// ============================================================

// @desc    Get A/B test report
// @route   GET /api/ml/abtest/report
const getABTestReport = asyncHandler(async (req, res) => {
  const result = await mlService.callML('/abtest/report');
  res.json(result);
});

// @desc    Log A/B test interaction
// @route   POST /api/ml/abtest/log
const logABTestInteraction = asyncHandler(async (req, res) => {
  const { group, userId, productId, action, revenue = 0 } = req.body;

  const result = await mlService.callML('/abtest/log', 'POST', {
    group,
    user_id: userId,
    product_id: productId,
    action,
    revenue,
    timestamp: new Date().toISOString(),
  });

  res.json(result);
});

// @desc    Compare A/B test groups
// @route   POST /api/ml/abtest/compare
const compareABTestGroups = asyncHandler(async (req, res) => {
  const { groupA = 'control', groupB = 'treatment' } = req.body;

  const result = await mlService.callML(`/abtest/compare?group_a=${groupA}&group_b=${groupB}`, 'POST');
  res.json(result);
});

// @desc    Reset A/B test data
// @route   POST /api/ml/abtest/reset
const resetABTest = asyncHandler(async (req, res) => {
  const result = await mlService.callML('/abtest/reset', 'POST');
  res.json(result);
});

// ============================================================
// ML Service Health & Info
// ============================================================

// @desc    Check ML service health
// @route   GET /api/ml/health
const getMLHealth = asyncHandler(async (req, res) => {
  const healthy = await mlService.checkHealth();
  const info = await mlService.getServiceInfo();

  res.json({
    success: true,
    data: {
      healthy,
      info: info.data || info,
    },
  });
});

module.exports = {
  getSessionRecommendations,
  trainSessionModel,
  trainCFModel,
  explainRecommendations,
  evaluateModels,
  getABTestReport,
  logABTestInteraction,
  compareABTestGroups,
  resetABTest,
  getMLHealth,
};
