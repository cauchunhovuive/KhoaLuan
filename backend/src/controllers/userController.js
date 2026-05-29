const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all users (Admin)
// @route   GET /api/users
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const where = {};

  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        clusterId: true,
        totalSpent: true,
        orderCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } },
  });
});

// @desc    Get user by ID (Admin)
// @route   GET /api/users/:id
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      address: true,
      role: true,
      clusterId: true,
      totalSpent: true,
      orderCount: true,
      createdAt: true,
      orders: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, finalAmount: true, status: true, createdAt: true },
      },
    },
  });

  if (!user) throw new AppError('Người dùng không tồn tại', 404);
  res.json({ success: true, data: user });
});

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, avatar, address, role, clusterId } = req.body;

  const data = {};
  if (name) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (avatar) data.avatar = avatar;
  if (address !== undefined) data.address = address;
  if (role) data.role = role;
  if (clusterId) data.clusterId = clusterId;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, phone: true, role: true, clusterId: true },
  });

  res.json({ success: true, data: user });
});

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  res.json({ success: true, message: 'Người dùng đã bị vô hiệu hóa' });
});

module.exports = { getUsers, getUser, updateUser, deleteUser };
