const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Helper: verify shop exists and is approved
const verifyShop = async (partnerId) => {
  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      name: true,
      avatar: true,
      storeName: true,
      storeDescription: true,
      isApproved: true,
    },
  });
  if (!partner || !partner.isApproved) {
    throw new AppError('Cửa hàng không tồn tại hoặc chưa được phê duyệt', 404);
  }
  return partner;
};

// @desc    Get partner shop showcase (public)
// @route   GET /api/shops/:partnerId
const getShopPage = asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  const { page = 1, limit = 12, sort = '-createdAt', category } = req.query;

  const partner = await verifyShop(partnerId);

  // Fetch full partner data with counts
  const partnerFull = await prisma.user.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      name: true,
      avatar: true,
      storeName: true,
      storeDescription: true,
      createdAt: true,
      _count: {
        select: {
          products: { where: { isActive: true } },
          followers: true,
        },
      },
    },
  });

  let orderBy = {};
  switch (sort) {
    case 'price': orderBy = { price: 'asc' }; break;
    case '-price': orderBy = { price: 'desc' }; break;
    case 'sold': orderBy = { soldCount: 'desc' }; break;
    case 'rating': orderBy = { rating: 'desc' }; break;
    case '-createdAt': orderBy = { createdAt: 'desc' }; break;
    default: orderBy = { createdAt: 'desc' };
  }

  const where = { partnerId, isActive: true };
  if (category) where.categoryId = category;

  const [products, totalProducts, totalSold, reviewStats] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.aggregate({
      where,
      _sum: { soldCount: true },
    }),
    prisma.review.aggregate({
      where: { product: { partnerId } },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  // Check if the current user is following this shop
  let isFollowing = false;
  if (req.user) {
    const follow = await prisma.followedShop.findUnique({
      where: {
        userId_partnerId: {
          userId: req.user.id,
          partnerId,
        },
      },
    });
    isFollowing = !!follow;
  }

  // Get available categories for this shop (for filtering)
  const shopCategories = await prisma.product.findMany({
    where: { partnerId, isActive: true },
    select: {
      category: { select: { id: true, name: true } },
    },
    distinct: ['categoryId'],
  });

  res.json({
    success: true,
    data: {
      partner: {
        id: partnerFull.id,
        name: partnerFull.name,
        avatar: partnerFull.avatar,
        storeName: partnerFull.storeName,
        storeDescription: partnerFull.storeDescription,
        createdAt: partnerFull.createdAt,
        productCount: partnerFull._count.products,
        followerCount: partnerFull._count.followers,
        totalSold: totalSold._sum.soldCount || 0,
        totalReviews: reviewStats._count || 0,
        averageRating: reviewStats._avg.rating || 0,
        isFollowing,
      },
      categories: shopCategories.map((c) => c.category),
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / parseInt(limit)),
      },
    },
  });
});

// @desc    Get shop reviews (reviews for all of a partner's products)
// @route   GET /api/shops/:partnerId/reviews
const getShopReviews = asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  const { page = 1, limit = 10, rating, sort = '-createdAt' } = req.query;

  await verifyShop(partnerId);

  const where = { product: { partnerId, isActive: true } };
  if (rating) {
    where.rating = parseInt(rating);
  }

  let orderBy = {};
  switch (sort) {
    case '-createdAt': orderBy = { createdAt: 'desc' }; break;
    case 'createdAt': orderBy = { createdAt: 'asc' }; break;
    case '-rating': orderBy = { rating: 'desc' }; break;
    case 'rating': orderBy = { rating: 'asc' }; break;
    default: orderBy = { createdAt: 'desc' };
  }

  const [reviews, total, aggregation] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        product: { select: { id: true, name: true, images: true, slug: true } },
      },
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  // Rating distribution
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

module.exports = {
  getShopPage,
  getShopReviews,
};
