const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { email, password, name, phone, address } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email đã được đăng ký', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      phone,
      address,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  });

  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  res.status(201).json({
    success: true,
    data: { user, token, refreshToken },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }

  // OAuth user (Google) không có password local
  if (!user.password) {
    throw new AppError('Tài khoản này được đăng nhập qua Google. Vui lòng dùng Google để đăng nhập.', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }

  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        storeName: user.storeName,
        storeDescription: user.storeDescription,
        taxCode: user.taxCode,
        businessAddress: user.businessAddress,
        isApproved: user.isApproved,
      },
      token,
      refreshToken,
    },
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError('Refresh token không được cung cấp', 400);
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Refresh token không hợp lệ', 401);
  }

  const newToken = generateToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken },
  });

  res.json({
    success: true,
    data: { token: newToken, refreshToken: newRefreshToken },
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      address: true,
      role: true,
      storeName: true,
      storeDescription: true,
      taxCode: true,
      businessAddress: true,
      isApproved: true,
      totalSpent: true,
      orderCount: true,
      createdAt: true,
    },
  });

  res.json({ success: true, data: user });
});

// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar, address } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name, phone, avatar, address },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      address: true,
    },
  });

  res.json({ success: true, data: user });
});

// @desc    Logout
// @route   POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { refreshToken: null },
  });

  res.json({ success: true, message: 'Đăng xuất thành công' });
});

// @desc    Check if email is already registered
// @route   POST /api/auth/check-email
const checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Vui lòng nhập email', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, authProvider: true },
  });

  res.json({
    success: true,
    data: {
      exists: !!user,
      authProvider: user?.authProvider || null,
    },
  });
});

// @desc    Google OAuth callback — redirect về frontend kèm token
// @route   GET /api/auth/google/callback
const googleCallback = asyncHandler(async (req, res) => {
  const { user, token, refreshToken } = req.user || {};

  if (!token) {
    // Lỗi — redirect về frontend với error
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }

  // Redirect về frontend kèm token trong hash fragment
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/auth/google/callback?token=${token}&refreshToken=${refreshToken}`);
});

// @desc    Change password
// @route   PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('Mật khẩu mới phải có ít nhất 6 ký tự', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new AppError('Mật khẩu hiện tại không đúng', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

module.exports = {
  register,
  login,
  refresh,
  getMe,
  updateProfile,
  logout,
  changePassword,
  checkEmail,
  googleCallback,
};
