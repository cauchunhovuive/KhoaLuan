const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get or create conversation
// @route   POST /api/chat/conversations
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { partnerId, orderId } = req.body;
  const userId = req.user.id;

  if (req.user.role === 'PARTNER' && req.user.id !== partnerId) {
    throw new AppError('Bạn không thể tạo cuộc trò chuyện với tư cách người khác', 403);
  }

  // Find existing conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      userId: req.user.role === 'PARTNER' ? undefined : userId,
      partnerId: req.user.role === 'PARTNER' ? userId : partnerId,
      ...(orderId ? { orderId } : {}),
    },
    include: {
      messages: {
        include: { sender: { select: { id: true, name: true, avatar: true, role: true } } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
  });

  if (!conversation) {
    const actualPartnerId = req.user.role === 'PARTNER' ? userId : partnerId;
    const actualUserId = req.user.role === 'PARTNER' ? orderId ? (await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } }))?.userId : userId : userId;

    conversation = await prisma.conversation.create({
      data: {
        userId: actualUserId,
        partnerId: actualPartnerId,
        orderId: orderId || null,
      },
      include: { messages: true },
    });
  }

  res.json({ success: true, data: conversation });
});

// @desc    Get user's conversations
// @route   GET /api/chat/conversations
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const isPartner = req.user.role === 'PARTNER';

  const where = isPartner ? { partnerId: userId } : { userId };

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      partner: { select: { id: true, name: true, avatar: true, storeName: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: { where: { isRead: false, senderId: { not: userId } } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ success: true, data: conversations });
});

// @desc    Get messages for a conversation
// @route   GET /api/chat/conversations/:id/messages
const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) throw new AppError('Cuộc trò chuyện không tồn tại', 404);

  const isParticipant = conversation.userId === req.user.id || conversation.partnerId === req.user.id;
  if (!isParticipant) throw new AppError('Bạn không có quyền xem tin nhắn này', 403);

  // Mark messages as read
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: req.user.id }, isRead: false },
    data: { isRead: true },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, name: true, avatar: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  });

  res.json({ success: true, data: messages.reverse() });
});

// @desc    Send message
// @route   POST /api/chat/conversations/:id/messages
const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, images } = req.body;

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) throw new AppError('Cuộc trò chuyện không tồn tại', 404);

  const isParticipant = conversation.userId === req.user.id || conversation.partnerId === req.user.id;
  if (!isParticipant) throw new AppError('Bạn không có quyền gửi tin nhắn', 403);

  if (!content && (!images || images.length === 0)) {
    throw new AppError('Tin nhắn không được để trống', 400);
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: req.user.id,
      content: content || '',
      images: images || [],
    },
    include: { sender: { select: { id: true, name: true, avatar: true, role: true } } },
  });

  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

  res.status(201).json({ success: true, data: message });
});

module.exports = { getOrCreateConversation, getConversations, getMessages, sendMessage };
