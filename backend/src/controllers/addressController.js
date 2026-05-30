const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get user's addresses
// @route   GET /api/addresses
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, data: addresses });
});

// @desc    Create address
// @route   POST /api/addresses
const createAddress = asyncHandler(async (req, res) => {
  const { label, fullName, phone, street, ward, district, city, isDefault } = req.body;
  const userId = req.user.id;

  if (!street || !city) throw new AppError('Địa chỉ không hợp lệ', 400);
  if (!req.body.fullName && !req.user.name) throw new AppError('Vui lòng nhập tên người nhận', 400);
  if (!req.body.phone && !req.user.phone) throw new AppError('Vui lòng nhập số điện thoại', 400);

  // If this is the default, unset other defaults
  if (isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({
    data: {
      userId,
      label: label || 'Khác',
      fullName: fullName || req.user.name,
      phone: phone || req.user.phone,
      street, ward, district, city,
      isDefault: isDefault || false,
    },
  });

  res.status(201).json({ success: true, data: address });
});

// @desc    Update address
// @route   PUT /api/addresses/:id
const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Địa chỉ không tồn tại', 404);

  const data = {};
  ['label', 'fullName', 'phone', 'street', 'ward', 'district', 'city', 'isDefault'].forEach((field) => {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  });

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  const address = await prisma.address.update({ where: { id }, data });
  res.json({ success: true, data: address });
});

// @desc    Delete address
// @route   DELETE /api/addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.address.findFirst({ where: { id, userId: req.user.id } });
  if (!existing) throw new AppError('Địa chỉ không tồn tại', 404);
  await prisma.address.delete({ where: { id } });
  res.json({ success: true, message: 'Đã xóa địa chỉ' });
});

module.exports = { getAddresses, createAddress, updateAddress, deleteAddress };
