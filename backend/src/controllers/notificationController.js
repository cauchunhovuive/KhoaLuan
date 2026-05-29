const { prisma } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all notifications (newest first)
// @route   GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { isRead: false },
  });

  res.json({
    success: true,
    data: { notifications, unreadCount },
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  res.json({ success: true });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});

module.exports = { getNotifications, markAsRead, markAllAsRead };
