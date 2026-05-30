const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const generateCouponCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ─── Admin: Get all coupons ───
const getAllCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isActive, type, search } = req.query;
  const where = {};

  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, role: true, storeName: true } },
        _count: { select: { usage: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.coupon.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      coupons,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total, totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// ─── Admin: Create coupon (or Partner via restrictTo) ───
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, type, value, minOrderValue, maxDiscount,
    usageLimit, perUserLimit, startsAt, expiresAt, description,
  } = req.body;

  if (!type || !value || value <= 0) {
    throw new AppError('Loại giảm giá và giá trị không hợp lệ', 400);
  }
  if (type === 'PERCENTAGE' && (value < 0 || value > 100)) {
    throw new AppError('Phần trăm giảm giá phải từ 0-100', 400);
  }

  const finalCode = code ? code.toUpperCase().replace(/\s/g, '') : generateCouponCode();

  // Check duplicate code
  const existing = await prisma.coupon.findUnique({ where: { code: finalCode } });
  if (existing) {
    throw new AppError('Mã giảm giá đã tồn tại', 400);
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: finalCode,
      type,
      value,
      minOrderValue: minOrderValue || null,
      maxDiscount: maxDiscount || null,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || 1,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      description,
      createdById: req.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, role: true, storeName: true } },
    },
  });

  res.status(201).json({ success: true, data: coupon });
});

// ─── Admin/Partner: Update coupon ───
const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    code, type, value, minOrderValue, maxDiscount,
    usageLimit, perUserLimit, startsAt, expiresAt, isActive, description,
  } = req.body;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new AppError('Mã giảm giá không tồn tại', 404);

  // Partner chỉ sửa coupon của mình
  if (req.user.role === 'PARTNER' && coupon.createdById !== req.user.id) {
    throw new AppError('Bạn không có quyền sửa mã giảm giá này', 403);
  }

  const updateData = {};
  if (code !== undefined) {
    const finalCode = code.toUpperCase().replace(/\s/g, '');
    const existing = await prisma.coupon.findUnique({ where: { code: finalCode } });
    if (existing && existing.id !== id) throw new AppError('Mã giảm giá đã tồn tại', 400);
    updateData.code = finalCode;
  }
  if (type !== undefined) updateData.type = type;
  if (value !== undefined) {
    if (value <= 0) throw new AppError('Giá trị không hợp lệ', 400);
    updateData.value = value;
  }
  if (minOrderValue !== undefined) updateData.minOrderValue = minOrderValue || null;
  if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount || null;
  if (usageLimit !== undefined) updateData.usageLimit = usageLimit || null;
  if (perUserLimit !== undefined) updateData.perUserLimit = perUserLimit;
  if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
  if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (description !== undefined) updateData.description = description;

  const updated = await prisma.coupon.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: { select: { id: true, name: true, role: true, storeName: true } },
    },
  });

  res.json({ success: true, data: updated });
});

// ─── Admin/Partner: Delete coupon ───
const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new AppError('Mã giảm giá không tồn tại', 404);

  if (req.user.role === 'PARTNER' && coupon.createdById !== req.user.id) {
    throw new AppError('Bạn không có quyền xóa mã giảm giá này', 403);
  }

  await prisma.coupon.delete({ where: { id } });
  res.json({ success: true, message: 'Đã xóa mã giảm giá' });
});

// ─── Partner: Get my coupons ───
const getMyCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const where = { createdById: req.user.id };

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      include: { _count: { select: { usage: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.coupon.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      coupons,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    },
  });
});

// ─── Customer: Validate a coupon code ───
const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code || !code.trim()) {
    throw new AppError('Vui lòng nhập mã giảm giá', 400);
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
  });

  if (!coupon) throw new AppError('Mã giảm giá không tồn tại', 404);
  if (!coupon.isActive) throw new AppError('Mã giảm giá đã bị vô hiệu hóa', 400);

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    throw new AppError('Mã giảm giá chưa đến hạn sử dụng', 400);
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw new AppError('Mã giảm giá đã hết hạn', 400);
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
  }

  // Check per-user limit
  const userUsageCount = await prisma.couponUsage.count({
    where: { couponId: coupon.id, userId },
  });
  if (userUsageCount >= coupon.perUserLimit) {
    throw new AppError('Bạn đã sử dụng mã giảm giá này quá số lần cho phép', 400);
  }

  res.json({
    success: true,
    data: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount,
      description: coupon.description,
    },
  });
});

// ─── Customer: Apply coupon (called from order creation) ───
const applyCouponToOrder = async (couponCode, userId, orderTotal) => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode.toUpperCase().trim() },
  });

  if (!coupon) throw new AppError('Mã giảm giá không tồn tại', 404);
  if (!coupon.isActive) throw new AppError('Mã giảm giá đã bị vô hiệu hóa', 400);

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) throw new AppError('Mã giảm giá chưa đến hạn', 400);
  if (coupon.expiresAt && now > coupon.expiresAt) throw new AppError('Mã giảm giá đã hết hạn', 400);
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError('Mã giảm giá đã hết lượt', 400);

  const userUsageCount = await prisma.couponUsage.count({
    where: { couponId: coupon.id, userId },
  });
  if (userUsageCount >= coupon.perUserLimit) throw new AppError('Bạn đã dùng mã này quá số lần cho phép', 400);

  if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
    throw new AppError(`Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}₫ để áp dụng mã này`, 400);
  }

  let discountAmount = 0;
  if (coupon.type === 'PERCENTAGE') {
    discountAmount = (orderTotal * coupon.value) / 100;
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else {
    discountAmount = coupon.value;
  }

  return { coupon, discountAmount };
};

module.exports = {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getMyCoupons,
  validateCoupon,
  applyCouponToOrder,
};
