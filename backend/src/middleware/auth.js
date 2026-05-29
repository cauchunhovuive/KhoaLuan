const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Vui lòng đăng nhập để tiếp tục', 401));
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, avatar: true },
    });

    if (!user) {
      return next(new AppError('Người dùng không tồn tại', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Token không hợp lệ hoặc đã hết hạn', 401));
  }
});

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Bạn không có quyền thực hiện hành động này', 403)
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };
