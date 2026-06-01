const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');

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

// @desc    Ask AI Chatbot (RAG via ML Service)
// @route   POST /api/chat/ai
const askAI = asyncHandler(async (req, res) => {
  const { question, messages } = req.body;

  if (!question && (!messages || !messages.length)) {
    throw new AppError('Vui lòng nhập câu hỏi', 400);
  }

  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  const timeout = 60000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Build user context if authenticated
    const userContext = req.user ? {
      name: req.user.name,
      role: req.user.role,
    } : null;

    let response;
    if (messages && messages.length > 0) {
      // Chat with history — append current question to messages
      const allMessages = [...messages, { role: 'user', content: question }];
      response = await fetch(`${ML_SERVICE_URL}/rag/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, user_context: userContext }),
        signal: controller.signal,
      });
    } else {
      // Single question
      response = await fetch(`${ML_SERVICE_URL}/rag/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, user_context: userContext }),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ML Service returned ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.json({
        success: true,
        data: {
          answer: 'Xin lỗi, yêu cầu đã quá thời gian chờ. Vui lòng thử lại với câu hỏi ngắn hơn.',
          sources: [],
          kb_docs_used: 0,
        },
      });
    }

    // ML Service unavailable - use local fallback (improved)
    logger.warn('ML Service unavailable for AI chat, using fallback:', error.message);

    const q = (question || '').toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);
    const userName = req.user?.name || '';
    let answer = '';

    // 1. Greetings
    if (q.includes('xin chào') || q.includes('chào') || words.includes('hi') || words.includes('hey') || words.includes('hello')) {
      if (userName) {
        answer = `Chào ${userName}! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn hôm nay? 😊`;
      } else {
        answer = 'Chào bạn! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn hôm nay? 😊';
      }
    // 2. Hỏi tên / bản thân
    } else if (q.includes('tên') || q.includes('tôi là ai') || q.includes('tôi tên')) {
      if (userName) {
        answer = `Bạn là ${userName} — thành viên của website chúng tôi! Tôi có thể giúp gì cho bạn không ạ?`;
      } else {
        answer = 'Bạn đang truy cập với tư cách khách. Hãy đăng nhập để được trải nghiệm đầy đủ tính năng nhé!';
      }
    // 3. Sản phẩm
    } else if (q.includes('sản phẩm') || q.includes('mua') || q.includes('tìm') || q.includes('có gì')) {
      answer = 'Bạn có thể tìm kiếm sản phẩm bằng thanh tìm kiếm ở đầu trang hoặc duyệt danh mục. Bạn cần tìm sản phẩm gì ạ?';
    // 4. Vận chuyển
    } else if (q.includes('vận chuyển') || q.includes('ship') || q.includes('giao hàng') || q.includes('nhận hàng')) {
      answer = 'Chúng tôi giao hàng toàn quốc! Miễn phí vận chuyển cho đơn hàng từ 500.000₫. Thời gian giao hàng từ 2-5 ngày tùy khu vực.';
    // 5. Đổi trả
    } else if (q.includes('trả') || q.includes('hoàn') || q.includes('đổi trả') || q.includes('bảo hành')) {
      answer = 'Hỗ trợ đổi trả trong vòng 7 ngày kể từ khi nhận hàng. Sản phẩm phải còn nguyên tem, chưa qua sử dụng.';
    // 6. Giá / khuyến mãi
    } else if (q.includes('giá') || q.includes('giảm') || q.includes('khuyến mãi') || q.includes('voucher') || q.includes('coupon')) {
      answer = 'Các sản phẩm có giá rất cạnh tranh! Hiện tại có nhiều mã giảm giá đang chờ bạn tại mục "Kho voucher".';
    // 7. Cảm ơn
    } else if (q.includes('cảm ơn') || q.includes('thanks') || q.includes('ok') || q.includes('good')) {
      answer = 'Cảm ơn bạn! Nếu cần hỗ trợ thêm, đừng ngần ngại hỏi tôi nhé. Chúc bạn một ngày tốt lành! 🌟';
    // 8. Đơn hàng
    } else if (q.includes('đơn hàng') || q.includes('order') || q.includes('đặt hàng')) {
      answer = 'Bạn có thể theo dõi đơn hàng trong mục "Đơn hàng của tôi" sau khi đăng nhập. Trạng thái được cập nhật theo thời gian thực.';
    // 9. Đăng nhập / tài khoản
    } else if (q.includes('đăng nhập') || q.includes('login') || q.includes('tài khoản')) {
      answer = 'Bạn có thể đăng nhập bằng email và mật khẩu. Nếu chưa có tài khoản, hãy đăng ký miễn phí nhé!';
    // 10. Short gibberish — trả lời thân thiện
    } else if (q.length <= 3) {
      const shortReplies = [
        'Có tôi đây! Bạn cần tôi hỗ trợ gì ạ? 😊',
        'Bạn muốn hỏi gì về sản phẩm hay đơn hàng không?',
        'Tôi đang nghe! Bạn cần tìm gì ạ?',
      ];
      answer = shortReplies[Math.floor(Math.random() * shortReplies.length)];
    // 11. Default
    } else {
      const defaultReplies = [
        'Cảm ơn bạn! Tôi có thể hỗ trợ bạn về sản phẩm, đơn hàng, vận chuyển, hoặc khuyến mãi. Bạn muốn hỏi gì ạ?',
        'Tôi hiểu câu hỏi của bạn. Bạn có thể nói rõ hơn để tôi hỗ trợ tốt hơn không?',
        'Rất vui được hỗ trợ bạn! Hãy cho tôi biết bạn cần gì nhé.',
      ];
      answer = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
    }

    res.json({
      success: true,
      data: { answer, sources: [], kb_docs_used: 0, fallback: true },
    });
  }
});

module.exports = { getOrCreateConversation, getConversations, getMessages, sendMessage, askAI };
