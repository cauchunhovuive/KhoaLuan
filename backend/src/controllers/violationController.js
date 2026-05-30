const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('./auditController');

// @desc    Report violation (User)
// @route   POST /api/violations
const createViolation = asyncHandler(async (req, res) => {
  const { targetId, targetType, reason, description, evidence } = req.body;
  if (!targetId || !targetType || !reason) throw new AppError('Thiếu thông tin báo cáo', 400);
  if (!['SHOP', 'PRODUCT'].includes(targetType)) throw new AppError('Loại vi phạm không hợp lệ', 400);

  const violation = await prisma.violation.create({
    data: {
      reportedById: req.user.id,
      targetId, targetType, reason, description,
      evidence: evidence || [],
    },
  });

  await prisma.notification.create({
    data: {
      type: 'SYSTEM',
      title: 'Báo cáo vi phạm mới',
      message: `Vi phạm ${targetType === 'SHOP' ? 'cửa hàng' : 'sản phẩm'}: ${reason}`,
      referenceId: violation.id,
    },
  });

  res.status(201).json({ success: true, data: violation });
});

// @desc    Get violations (Admin)
// @route   GET /api/violations
const getViolations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, targetType } = req.query;
  const where = {};
  if (status) where.status = status;
  if (targetType) where.targetType = targetType;

  const [violations, total] = await Promise.all([
    prisma.violation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.violation.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      violations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    },
  });
});

// @desc    Update violation status (Admin)
// @route   PUT /api/violations/:id
const updateViolation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, penalty } = req.body;

  const violation = await prisma.violation.findUnique({ where: { id } });
  if (!violation) throw new AppError('Vi phạm không tồn tại', 404);

  const data = { status, resolvedAt: new Date() };
  if (penalty !== undefined) data.penalty = penalty;

  const updated = await prisma.violation.update({ where: { id }, data });

  // Apply penalty if BAN
  if (penalty === 'BAN' && violation.targetType === 'SHOP') {
    await prisma.user.update({ where: { id: violation.targetId }, data: { isActive: false } });
  }

  logAction(req.user.id, 'UPDATE', 'VIOLATION', id, { status, penalty });
  res.json({ success: true, data: updated });
});

module.exports = { createViolation, getViolations, updateViolation };
