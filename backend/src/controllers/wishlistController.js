const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get user's wishlist
// @route   GET /api/wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          discountPrice: true,
          images: true,
          rating: true,
          soldCount: true,
          stock: true,
          isActive: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: items.map((item) => item.product),
  });
});

// @desc    Add to wishlist
// @route   POST /api/wishlist/:productId
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError('Sản phẩm không tồn tại', 404);
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    return res.json({ success: true, message: 'Sản phẩm đã có trong danh sách yêu thích' });
  }

  await prisma.wishlistItem.create({
    data: { userId, productId },
  });

  res.status(201).json({ success: true, message: 'Đã thêm vào danh sách yêu thích' });
});

// @desc    Remove from wishlist
// @route   DELETE /api/wishlist/:productId
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (!existing) {
    throw new AppError('Sản phẩm không có trong danh sách yêu thích', 404);
  }

  await prisma.wishlistItem.delete({
    where: { userId_productId: { userId, productId } },
  });

  res.json({ success: true, message: 'Đã xoá khỏi danh sách yêu thích' });
});

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
const checkWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  res.json({ success: true, data: { isWishlisted: !!existing } });
});

// @desc    Get wishlist IDs for user
// @route   GET /api/wishlist/ids
const getWishlistIds = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });

  res.json({ success: true, data: items.map((item) => item.productId) });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist, checkWishlist, getWishlistIds };
