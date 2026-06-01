const express = require('express');
const router = express.Router();
const { getOrCreateConversation, getConversations, getMessages, sendMessage, askAI } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.post('/conversations', protect, getOrCreateConversation);
router.get('/conversations', protect, getConversations);
router.get('/conversations/:id/messages', protect, getMessages);
router.post('/conversations/:id/messages', protect, sendMessage);

// AI Chat (có thể dùng không cần đăng nhập)
router.post('/ai', askAI);

module.exports = router;
