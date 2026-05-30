const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('./auditController');

// @desc    Get active flash sales (public)
// @route   GET /api/flash-sales
const getActiveFlashSales = asyncHandler(async (req, res) => {
  const now = new Date();
  const flashSales = await prisma.flashSale.findMany({
    where: { isActive: true, startTime: { lte: now }, endTime: { gte: now } },
    include: {
      products: {
        include: { product: { include: { category: { select: { name: true } } } } },
      },
    },
    orderBy: { startTime: 'asc' },
  });
  res.json({ success: true, data: flashSales });
});

// @desc    Get all flash sales (Admin)
// @route   GET /api/flash-sales/admin/all
const getAllFlashSales = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [flashSales, total] = await Promise.all([
    prisma.flashSale.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { startTime: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.flashSale.count(),
  ]);
  res.json({
    success: true,
    data: { flashSales, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } },
  });
});

// @desc    Get flash sale by ID
// @route   GET /api/flash-sales/:id
const getFlashSale = asyncHandler(async (req, res) => {
  const flashSale = await prisma.flashSale.findUnique({
    where: { id: req.params.id },
    include: {
      products: {
        include: { product: { include: { category: { select: { name: true } } } } },
      },
    },
  });
  if (!flashSale) throw new AppError('Flash sale không tồn tại', 404);
  res.json({ success: true, data: flashSale });
});

// @desc    Create flash sale
// @route   POST /api/flash-sales
const createFlashSale = asyncHandler(async (req, res) => {
  const { title, description, bannerUrl, startTime, endTime } = req.body;
  if (!title || !startTime || !endTime) throw new AppError('Thiếu thông tin bắt buộc', 400);

  const flashSale = await prisma.flashSale.create({
    data: { title, description, bannerUrl, startTime: new Date(startTime), endTime: new Date(endTime) },
  });
  logAction(req.user.id, 'CREATE', 'FLASH_SALE', flashSale.id);
  res.status(201).json({ success: true, data: flashSale });
});

// @desc    Update flash sale
// @route   PUT /api/flash-sales/:id
const updateFlashSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = {};
  ['title', 'description', 'bannerUrl', 'startTime', 'endTime', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) {
      data[field] = field.endsWith('Time') ? new Date(req.body[field]) : req.body[field];
    }
  });
  const flashSale = await prisma.flashSale.update({ where: { id }, data });
  logAction(req.user.id, 'UPDATE', 'FLASH_SALE', id);
  res.json({ success: true, data: flashSale });
});

// @desc    Delete flash sale
// @route   DELETE /api/flash-sales/:id
const deleteFlashSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.flashSaleProduct.deleteMany({ where: { flashSaleId: id } });
  await prisma.flashSale.delete({ where: { id } });
  logAction(req.user.id, 'DELETE', 'FLASH_SALE', id);
  res.json({ success: true, message: 'Đã xóa flash sale' });
});

// @desc    Add product to flash sale
// @route   POST /api/flash-sales/:id/products
const addFlashSaleProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { productId, salePrice, maxQuantity } = req.body;
  if (!productId || !salePrice) throw new AppError('Thiếu thông tin sản phẩm', 400);

  const flashSale = await prisma.flashSale.findUnique({ where: { id } });
  if (!flashSale) throw new AppError('Flash sale không tồn tại', 404);

  const item = await prisma.flashSaleProduct.create({
    data: { flashSaleId: id, productId, salePrice, maxQuantity: maxQuantity || 0 },
    include: { product: { select: { name: true, images: true, price: true } } },
  });
  res.status(201).json({ success: true, data: item });
});

// @desc    Remove product from flash sale
// @route   DELETE /api/flash-sales/:id/products/:productId
const removeFlashSaleProduct = asyncHandler(async (req, res) => {
  const { id, productId } = req.params;
  await prisma.flashSaleProduct.deleteMany({
    where: { flashSaleId: id, productId },
  });
  res.json({ success: true, message: 'Đã xóa sản phẩm khỏi flash sale' });
});

module.exports = {
  getActiveFlashSales, getAllFlashSales, getFlashSale,
  createFlashSale, updateFlashSale, deleteFlashSale,
  addFlashSaleProduct, removeFlashSaleProduct,
};
