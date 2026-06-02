const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── Helper: get active flash sale prices for a list of product IDs ───
const getFlashSalePrices = async (productIds) => {
  if (!productIds.length) return {};
  const now = new Date();
  const flashProducts = await prisma.flashSaleProduct.findMany({
    where: {
      productId: { in: productIds },
      flashSale: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
    select: {
      productId: true,
      salePrice: true,
      maxQuantity: true,
      soldCount: true,
      flashSale: { select: { id: true, title: true } },
    },
  });
  return flashProducts.reduce((map, fp) => {
    map[fp.productId] = fp;
    return map;
  }, {});
};

// @desc    Get cart items
// @route   GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          discountPrice: true,
          images: true,
          stock: true,
          isActive: true,
        },
      },
    },
  });

  // Lấy giá flash sale nếu có
  const productIds = items.map((i) => i.productId);
  const flashPrices = await getFlashSalePrices(productIds);

  // Gắn flash sale info vào từng item + tính total
  let total = 0;
  const enrichedItems = items.map((item) => {
    const flashInfo = flashPrices[item.productId];
    const effectivePrice = flashInfo ? flashInfo.salePrice : (item.product.discountPrice || item.product.price);
    total += effectivePrice * item.quantity;

    return {
      ...item,
      effectivePrice,
      flashSale: flashInfo
        ? {
            id: flashInfo.flashSale.id,
            title: flashInfo.flashSale.title,
            salePrice: flashInfo.salePrice,
            maxQuantity: flashInfo.maxQuantity,
            soldCount: flashInfo.soldCount,
          }
        : null,
    };
  });

  res.json({ success: true, data: { items: enrichedItems, total, count: items.length } });
});

// @desc    Add to cart
// @route   POST /api/cart
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw new AppError('Sản phẩm không tồn tại', 404);
  if (quantity > product.stock) throw new AppError('Số lượng vượt quá tồn kho', 400);

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: req.user.id, productId } },
  });

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > product.stock) throw new AppError('Số lượng vượt quá tồn kho', 400);

    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { userId: req.user.id, productId, quantity },
    });
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: { product: { select: { id: true, name: true, price: true, discountPrice: true, images: true, stock: true } } },
  });

  res.json({ success: true, data: { items, count: items.length } });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity < 1) throw new AppError('Số lượng phải lớn hơn 0', 400);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('Sản phẩm không tồn tại', 404);
  if (quantity > product.stock) throw new AppError('Số lượng vượt quá tồn kho', 400);

  await prisma.cartItem.update({
    where: { userId_productId: { userId: req.user.id, productId } },
    data: { quantity },
  });

  res.json({ success: true, message: 'Cập nhật giỏ hàng thành công' });
});

// @desc    Remove from cart
// @route   DELETE /api/cart/:productId
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  await prisma.cartItem.delete({
    where: { userId_productId: { userId: req.user.id, productId } },
  });

  res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
});

// @desc    Clear cart
// @route   DELETE /api/cart
const clearCart = asyncHandler(async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
  res.json({ success: true, message: 'Đã xóa giỏ hàng' });
});

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
