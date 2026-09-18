const { prisma } = require('../config/database');
const { cacheDel } = require('../config/redis');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const [reviews, total, aggregation] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.review.count({ where: { productId } }),
    prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  // Rating distribution
  const distribution = await prisma.review.groupBy({
    by: ['rating'],
    where: { productId },
    _count: true,
  });

  const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((d) => { ratingDist[d.rating] = d._count; });

  res.json({
    success: true,
    data: {
      reviews,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      stats: {
        averageRating: aggregation._avg.rating || 0,
        totalReviews: aggregation._count,
        ratingDistribution: ratingDist,
      },
    },
  });
});

// @desc    Create review
// @route   POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body;
  const userId = req.user.id;

  // Check if user purchased the product
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        status: 'DELIVERED',
      },
    },
  });

  if (!hasPurchased) {
    throw new AppError('Bạn cần mua sản phẩm để có thể đánh giá', 400);
  }

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    throw new AppError('Bạn đã đánh giá sản phẩm này rồi', 400);
  }

  const review = await prisma.review.create({
    data: { userId, productId, rating, comment },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  // Update product rating
  const aggregation = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: aggregation._avg.rating,
      reviewCount: aggregation._count,
    },
  });

  await cacheDel(`product:${productId}`);

  res.status(201).json({ success: true, data: review });
});

// @desc    Update review (edit existing review)
// @route   PUT /api/reviews/:id
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError('Đánh giá không tồn tại', 404);
  if (review.userId !== req.user.id) {
    throw new AppError('Bạn không có quyền sửa đánh giá này', 403);
  }

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    throw new AppError('Điểm đánh giá phải từ 1-5', 400);
  }

  const data = {};
  if (rating !== undefined) data.rating = rating;
  if (comment !== undefined) data.comment = comment;

  const updated = await prisma.review.update({
    where: { id },
    data,
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  // Re-calculate product rating
  const aggregation = await prisma.review.aggregate({
    where: { productId: review.productId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.product.update({
    where: { id: review.productId },
    data: {
      rating: aggregation._avg.rating,
      reviewCount: aggregation._count,
    },
  });

  await cacheDel(`product:${review.productId}`);

  res.json({ success: true, data: updated, message: 'Đã cập nhật đánh giá' });
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const review = await prisma.review.findUnique({ where: { id } });

  if (!review) throw new AppError('Đánh giá không tồn tại', 404);
  if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Bạn không có quyền xóa đánh giá này', 403);
  }

  await prisma.review.delete({ where: { id } });

  // Update product rating
  const aggregation = await prisma.review.aggregate({
    where: { productId: review.productId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.product.update({
    where: { id: review.productId },
    data: {
      rating: aggregation._avg.rating || 0,
      reviewCount: aggregation._count,
    },
  });

  await cacheDel(`product:${review.productId}`);

  res.json({ success: true, message: 'Đánh giá đã được xóa' });
});

// @desc    Reply to review (Partner/Admin)
// @route   PUT /api/reviews/:id/reply
const replyReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply || !reply.trim()) {
    throw new AppError('Nội dung phản hồi không được để trống', 400);
  }

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, partnerId: true } },
    },
  });

  if (!review) throw new AppError('Đánh giá không tồn tại', 404);

  // Partner chỉ có thể phản hồi đánh giá sản phẩm của mình
  if (req.user.role === 'PARTNER' && review.product.partnerId !== req.user.id) {
    throw new AppError('Bạn không có quyền phản hồi đánh giá này', 403);
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { reply: reply.trim(), repliedAt: new Date() },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      product: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: updated });
});

// @desc    Get reviews for partner's products
// @route   GET /api/reviews/partner
const getPartnerReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const partnerId = req.user.id;

  const where = {
    product: { partnerId },
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        product: { select: { id: true, name: true, images: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.review.count({ where }),
  ]);

  // Stats
  const aggregation = await prisma.review.aggregate({
    where,
    _avg: { rating: true },
    _count: true,
  });

  const distribution = await prisma.review.groupBy({
    by: ['rating'],
    where,
    _count: true,
  });

  const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((d) => { ratingDist[d.rating] = d._count; });

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      stats: {
        averageRating: aggregation._avg.rating || 0,
        totalReviews: aggregation._count,
        ratingDistribution: ratingDist,
      },
    },
  });
});

module.exports = { getProductReviews, createReview, updateReview, deleteReview, replyReview, getPartnerReviews };
