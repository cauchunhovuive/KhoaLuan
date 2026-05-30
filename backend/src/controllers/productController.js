const { prisma } = require('../config/database');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all products with filtering, sorting, pagination
// @route   GET /api/products
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    category,
    minPrice,
    maxPrice,
    rating,
    sort = '-createdAt',
    search,
    inStock,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = { isActive: true };

  if (category) where.categoryId = category;
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }
  if (rating) where.rating = { gte: parseFloat(rating) };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (inStock === 'true') where.stock = { gt: 0 };

  let orderBy = {};
  switch (sort) {
    case 'price': orderBy = { price: 'asc' }; break;
    case '-price': orderBy = { price: 'desc' }; break;
    case 'sold': orderBy = { soldCount: 'desc' }; break;
    case 'rating': orderBy = { rating: 'desc' }; break;
    case '-createdAt': orderBy = { createdAt: 'desc' }; break;
    default: orderBy = { createdAt: 'desc' };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: parseInt(limit),
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try cache first
  const cached = await cacheGet(`product:${id}`);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      reviews: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!product) {
    throw new AppError('Sản phẩm không tồn tại', 404);
  }

  // Cache for 5 minutes
  await cacheSet(`product:${id}`, product, 300);

  res.json({ success: true, data: product });
});

// @desc    Create product (Admin/Partner)
// @route   POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discountPrice, images, stock, categoryId } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const data = { name, slug, description, price, discountPrice, images, stock, categoryId };

  // Nếu là partner, gắn partnerId
  if (req.user.role === 'PARTNER') {
    if (!req.user.isApproved) {
      throw new AppError('Tài khoản đối tác chưa được phê duyệt', 403);
    }
    data.partnerId = req.user.id;
  }

  const product = await prisma.product.create({ data });

  await cacheDel('products:*');

  res.status(201).json({ success: true, data: product });
});

// @desc    Update product (Admin/Partner)
// @route   PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, discountPrice, images, stock, categoryId, isActive } = req.body;

  // Kiểm tra quyền sở hữu nếu là partner
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Sản phẩm không tồn tại', 404);

  if (req.user.role === 'PARTNER' && existing.partnerId !== req.user.id) {
    throw new AppError('Bạn không có quyền sửa sản phẩm này', 403);
  }

  const data = {};
  if (name) { data.name = name; data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  if (description !== undefined) data.description = description;
  if (price !== undefined) data.price = price;
  if (discountPrice !== undefined) data.discountPrice = discountPrice;
  if (images) data.images = images;
  if (stock !== undefined) data.stock = stock;
  if (categoryId) data.categoryId = categoryId;
  if (isActive !== undefined) data.isActive = isActive;

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  await cacheDel(`product:${id}`);

  res.json({ success: true, data: product });
});

// @desc    Delete product (Admin/Partner)
// @route   DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Sản phẩm không tồn tại', 404);

  if (req.user.role === 'PARTNER' && existing.partnerId !== req.user.id) {
    throw new AppError('Bạn không có quyền xoá sản phẩm này', 403);
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  await cacheDel(`product:${id}`);

  res.json({ success: true, message: 'Sản phẩm đã được xóa' });
});

// @desc    Get product by slug
// @route   GET /api/products/slug/:slug
const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true } },
      reviews: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!product) throw new AppError('Sản phẩm không tồn tại', 404);
  res.json({ success: true, data: product });
});

// @desc    Get featured products
// @route   GET /api/products/featured
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    where: { isActive: true, stock: { gt: 0 } },
    orderBy: { soldCount: 'desc' },
    take: 8,
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: products });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductBySlug,
  getFeaturedProducts,
};
