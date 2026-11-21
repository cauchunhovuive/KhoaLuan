const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const mlService = require('../services/mlService');

// ============================================================
// Session-Based Recommendations
// ============================================================

// @desc    Get session-based recommendations for a user's current browsing
// @route   POST /api/ml/session/recommend
const getSessionRecommendations = asyncHandler(async (req, res) => {
  const { sessionItems, topN = 10, strategy = 'hybrid', alpha = null, excludeSessionItems = true } = req.body;

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
  // Lấy 5000 logs gần nhất — trước đây 1000 logs chỉ dựng được ~20 phiên
  // (phiên bị cắt cụt ở rìa cửa sổ), model HSP/RIC học thiếu quan hệ.
  let recentViews = [];
  try {
    if (prisma.productView) {
      recentViews = await prisma.productView.findMany({
        take: 10000,  // dùng tối đa data cho model session (đồng bộ /session/train)
        orderBy: { createdAt: 'desc' },
        select: { userId: true, productId: true, createdAt: true },
      });
    }
  } catch (e) {
    // ProductView model may not exist yet
  }

  // Gửi view_logs kèm MỌI request: Python service tự quyết định có fit lại
  // không (model chưa có / model yếu hơn data / data mới hơn model). Trước đây
  // chỉ gửi khi model chưa có → model yếu 22 phiên bị "kẹt" mãi mãi.
  if (recentViews.length > 0) {
    try {
      await mlService.callML('/session/train', 'POST', {
        force: false,
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
  let mlMeta = { strategy, success: false };
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
      // UI thật: không gợi ý lại các sản phẩm khách đã xem trong phiên
      // (benchmark offline để false — đo MRR/Recall đúng protocol bài báo)
      exclude_session_items: !!excludeSessionItems,
      ...(alpha != null ? { alpha } : {}),
    });

    if (result.success) {
      recommendations = result.data?.recommendations || [];
      mlMeta = {
        success: true,
        strategy: result.data?.strategy || strategy,
        session_items_count: result.data?.session_items_count || sessionItems.length,
      };
    }
  } catch (e) {
    // ML failed
  }

  let recommendedProducts = [];
  if (recommendations.length > 0) {
    recommendedProducts = await enrichRecommendations(recommendations);
  }

  res.json({ success: true, data: recommendedProducts, meta: mlMeta });
});

/**
 * Helper: lấy thông tin đầy đủ của các sản phẩm được ML gợi ý (giữ thứ tự + score/reason)
 */
async function enrichRecommendations(recommendations) {
  if (!recommendations || !recommendations.length) return [];

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

  return recommendations
    .map(r => {
      const product = productMap.get(r.product_id);
      if (!product) return null;
      return {
        ...product,
        score: r.score,
        probability: r.probability,
        reason: r.reason,
        hsp_level: r.hsp_level,
      };
    })
    .filter(Boolean);
}

// @desc    Train session model with recent view logs
// @route   POST /api/ml/session/train
const trainSessionModel = asyncHandler(async (req, res) => {
  let recentViews = [];
  try {
    if (prisma.productView) {
      recentViews = await prisma.productView.findMany({
        take: 10000,
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
    force: req.body?.force === true,
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
// ML Service Health & Info
// ============================================================

// @desc    Check ML service health
// @route   GET /api/ml/paper/data?dataset=yoochoose
const getPaperData = asyncHandler(async (req, res) => {
  const ds = req.query?.dataset ? `?dataset=${encodeURIComponent(req.query.dataset)}` : '';
  const result = await mlService.callML(`/session/paper-data${ds}`);
  res.json(result);
});

// @desc    Chạy benchmark HSP & RIC trên dataset bài báo (yoochoose | diginetica)
// @route   POST /api/ml/paper/benchmark
const runPaperBenchmark = asyncHandler(async (req, res) => {
  const { maxTest = 500, dataset = 'yoochoose' } = req.body;
  const result = await mlService.callML('/session/benchmark', 'POST', { max_test: maxTest, dataset });
  res.json(result);
});

// @desc    Gợi ý bằng model train sẵn trên dataset bài báo (yoochoose | diginetica)
// @route   POST /api/ml/paper/recommend
const paperRecommend = asyncHandler(async (req, res) => {
  const { sessionItems, topN = 10, strategy = 'hybrid', alpha = null, dataset = 'yoochoose' } = req.body;

  if (!sessionItems || !sessionItems.length) {
    return res.status(400).json({ success: false, message: 'Thiếu sessionItems' });
  }

  const result = await mlService.callML('/session/paper-recommend', 'POST', {
    session_items: sessionItems,
    top_n: topN,
    strategy,
    dataset,
    ...(alpha != null ? { alpha } : {}),
  });
  res.json(result);
});

// @desc    Reset model + cache benchmark (1 dataset hoặc tất cả — lần sau train lại từ đầu)
// @route   POST /api/ml/paper/reset
const resetPaperBenchmark = asyncHandler(async (req, res) => {
  const { dataset = 'all' } = req.body || {};
  const result = await mlService.callML(`/session/benchmark/reset?dataset=${encodeURIComponent(dataset)}`, 'POST');
  res.json(result);
});

// @desc    Model bài báo đã học được gì — P0/P1/P2 + γ với phân số đếm thô (demo bài báo)
// @route   POST /api/ml/paper/insights
const paperInsights = asyncHandler(async (req, res) => {
  const { sessionItems = [], topK = 4, dataset = 'yoochoose' } = req.body || {};
  const result = await mlService.callML('/session/paper-insights', 'POST', {
    session_items: sessionItems,
    top_k: topK,
    dataset,
  });
  res.json(result);
});

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
  getMLHealth,
};
