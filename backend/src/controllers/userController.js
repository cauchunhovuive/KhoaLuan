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

// @desc    Follow a shop
// @route   POST /api/users/follow
const followShop = asyncHandler(async (req, res) => {
  const { partnerId } = req.body;
  if (!partnerId) throw new AppError('Thiếu thông tin shop', 400);

  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner || partner.role !== 'PARTNER') throw new AppError('Shop không tồn tại', 404);

  const existing = await prisma.followedShop.findUnique({
    where: { userId_partnerId: { userId: req.user.id, partnerId } },
  });
  if (existing) throw new AppError('Bạn đã theo dõi shop này rồi', 400);

  const follow = await prisma.followedShop.create({
    data: { userId: req.user.id, partnerId },
  });

  res.status(201).json({ success: true, data: follow });
});

// @desc    Unfollow a shop
// @route   DELETE /api/users/follow/:partnerId
const unfollowShop = asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  const existing = await prisma.followedShop.findUnique({
    where: { userId_partnerId: { userId: req.user.id, partnerId } },
  });
  if (!existing) throw new AppError('Bạn chưa theo dõi shop này', 404);

  await prisma.followedShop.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Đã bỏ theo dõi shop' });
});

// @desc    Get user's followed shops
// @route   GET /api/users/follow
const getFollowedShops = asyncHandler(async (req, res) => {
  const shops = await prisma.followedShop.findMany({
    where: { userId: req.user.id },
    include: {
      partner: { select: { id: true, name: true, storeName: true, avatar: true, storeDescription: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: shops });
});

module.exports = { getUsers, getUser, updateUser, deleteUser, followShop, unfollowShop, getFollowedShops };
