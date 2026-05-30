const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('./auditController');

// @desc    Get active banners (public)
// @route   GET /api/banners
const getBanners = asyncHandler(async (req, res) => {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
  });
  res.json({ success: true, data: banners });
});

// @desc    Get all banners (Admin)
// @route   GET /api/banners/admin/all
const getAllBanners = asyncHandler(async (req, res) => {
  const banners = await prisma.banner.findMany({ orderBy: { position: 'asc' } });
  res.json({ success: true, data: banners });
});

// @desc    Create banner
// @route   POST /api/banners
const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, imageUrl, linkUrl, linkText, position, bgColor } = req.body;
  if (!imageUrl) throw new AppError('Image URL is required', 400);

  const banner = await prisma.banner.create({
    data: { title, subtitle, imageUrl, linkUrl, linkText, position: position || 0, bgColor },
  });

  logAction(req.user.id, 'CREATE', 'BANNER', banner.id, { title: banner.title });
  res.status(201).json({ success: true, data: banner });
});

// @desc    Update banner
// @route   PUT /api/banners/:id
const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = {};
  ['title', 'subtitle', 'imageUrl', 'linkUrl', 'linkText', 'position', 'isActive', 'bgColor'].forEach((field) => {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  });

  const banner = await prisma.banner.update({ where: { id }, data });
  logAction(req.user.id, 'UPDATE', 'BANNER', id);
  res.json({ success: true, data: banner });
});

// @desc    Delete banner
// @route   DELETE /api/banners/:id
const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.banner.delete({ where: { id } });
  logAction(req.user.id, 'DELETE', 'BANNER', id);
  res.json({ success: true, message: 'Đã xóa banner' });
});

module.exports = { getBanners, getAllBanners, createBanner, updateBanner, deleteBanner };
