const { prisma } = require('../config/database');
const { cacheDel } = require('../config/redis');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all categories
// @route   GET /api/categories
const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: categories });
});

// @desc    Get single category
// @route   GET /api/categories/:id
const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!category) throw new AppError('Danh mục không tồn tại', 404);
  res.json({ success: true, data: category });
});

// @desc    Create category (Admin)
// @route   POST /api/categories
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const category = await prisma.category.create({
    data: { name, slug, description, image },
  });

  res.status(201).json({ success: true, data: category });
});

// @desc    Update category (Admin)
// @route   PUT /api/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, image, isActive } = req.body;

  const data = {};
  if (name) { data.name = name; data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  if (description !== undefined) data.description = description;
  if (image) data.image = image;
  if (isActive !== undefined) data.isActive = isActive;

  const category = await prisma.category.update({ where: { id }, data });
  res.json({ success: true, data: category });
});

// @desc    Delete category (Admin)
// @route   DELETE /api/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.category.update({ where: { id }, data: { isActive: false } });
  res.json({ success: true, message: 'Danh mục đã được xóa' });
});

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };
