const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// Create audit log entry
const logAction = async (userId, action, entity, entityId = null, details = null, ipAddress = null) => {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, details: details ? JSON.stringify(details) : null, ipAddress },
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

// @desc    Get audit logs (Admin)
// @route   GET /api/audit
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, entity, userId } = req.query;
  const where = {};
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    },
  });
});

// @desc    Create audit log (manual)
// @route   POST /api/audit
const createAuditLog = asyncHandler(async (req, res) => {
  const { action, entity, entityId, details } = req.body;
  const log = await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action,
      entity,
      entityId,
      details: details ? JSON.stringify(details) : null,
      ipAddress: req.ip,
    },
  });
  res.status(201).json({ success: true, data: log });
});

module.exports = { logAction, getAuditLogs, createAuditLog };
