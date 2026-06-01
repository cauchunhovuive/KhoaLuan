import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiMessageSquare, FiX, FiSend, FiUser,
  FiZap, FiExternalLink, FiArrowLeft,
} from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ─── AI Responses Simulator ───────────────────────────────
const AI_RESPONSES = [
  { keywords: ['xin chào', 'hello', 'hi', 'chào'], response: 'Chào bạn! Tôi là trợ lý AI của cửa hàng. Tôi có thể giúp gì cho bạn hôm nay? 😊' },
  { keywords: ['sản phẩm', 'mua', 'tìm'], response: 'Bạn có thể tìm kiếm sản phẩm bằng thanh tìm kiếm ở đầu trang hoặc ghé thăm danh mục sản phẩm. Bạn cần tìm sản phẩm gì ạ?' },
  { keywords: ['giá', 'bao nhiêu', 'giảm', 'khuyến mãi'], response: 'Các sản phẩm của chúng tôi có giá rất cạnh tranh! Bạn có thể xem chi tiết giá và khuyến mãi trên trang sản phẩm. Hiện tại có nhiều mã giảm giá đang chờ bạn!' },
  { keywords: ['đơn hàng', 'order', 'đặt hàng'], response: 'Bạn có thể theo dõi đơn hàng trong mục "Đơn hàng của tôi" sau khi đăng nhập. Nếu cần hỗ trợ, hãy chat với shop qua tab "Shop" bên cạnh nhé!' },
  { keywords: ['vận chuyển', 'ship', 'giao hàng'], response: 'Chúng tôi giao hàng toàn quốc! Miễn phí vận chuyển cho đơn hàng từ 500.000₫. Thời gian giao hàng từ 2-5 ngày tùy khu vực.' },
  { keywords: ['trả', 'hoàn', 'đổi trả'], response: 'Chúng tôi hỗ trợ đổi trả trong vòng 7 ngày kể từ khi nhận hàng. Sản phẩm phải còn nguyên tem, chưa qua sử dụng.' },
  { keywords: ['cảm ơn', 'thanks'], response: 'Cảm ơn bạn! Nếu cần hỗ trợ thêm, đừng ngần ngại chat với tôi nhé. Chúc bạn một ngày tốt lành! 🌟' },
];

const getAIResponse = (message) => {
  const lower = message.toLowerCase();
  for (const item of AI_RESPONSES) {
    if (item.keywords.some(k => lower.includes(k))) {
      return item.response;
    }
  }
  const fallbacks = [
    'Cảm ơn bạn đã quan tâm! Tôi có thể giúp bạn tìm sản phẩm, kiểm tra đơn hàng, hoặc giải đáp thắc mắc về chính sách.',
    'Tôi hiểu câu hỏi của bạn. Bạn có thể nói rõ hơn để tôi hỗ trợ tốt hơn không?',
    'Rất vui được hỗ trợ bạn! Hãy cho tôi biết bạn cần gì nhé.',
    'Tôi đang học hỏi mỗi ngày! Bạn có thể hỏi tôi về sản phẩm, giá cả, vận chuyển, hoặc đổi trả hàng.',
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

// ─── Component ────────────────────────────────────────────
const ChatFloating = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'ai'

  // ── Shop Chat State ──
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // ── AI Chat State ──
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const aiMessagesEndRef = useRef(null);

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiTyping]);

  // ── Fetch conversations when panel opens ──
  useEffect(() => {
    if (isOpen && isAuthenticated && activeTab === 'shop') {
      fetchConversations();
    }
  }, [isOpen, activeTab, isAuthenticated]);



  const fetchConversations = async () => {
    setLoadingConvs(true);
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.data || []);
    } catch (err) {
      // Silent
    } finally {
      setLoadingConvs(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const { data } = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(data.data || []);
    } catch (err) {
      toast.error('Không thể tải tin nhắn');
    }
  };

  const selectConversation = (conv) => {
    setSelectedConv(conv);
    fetchMessages(conv.id);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConv) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/conversations/${selectedConv.id}/messages`, { content: messageText.trim() });
      setMessages(prev => [...prev, data.data]);
      setMessageText('');
      fetchConversations();
    } catch (err) {
      toast.error('Gửi tin nhắn thất bại');
    } finally {
      setSending(false);
    }
  };

  const handleAISend = useCallback(() => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiInput('');

    setAiMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMsg }]);
    setAiTyping(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const response = getAIResponse(userMsg);
      setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: response }]);
      setAiTyping(false);
    }, 800 + Math.random() * 600);
  }, [aiInput]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSelectedConv(null);
    }
  };

  // ── Check if user is partner (for partner chat, they should see their own conversations) ──
  const isPartner = user?.role === 'PARTNER';

  return (
    <>
      {/* ─═ Floating Toggle Button ═─ */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-2xl flex items-center justify-center shadow-premium-xl transition-all duration-300 active:scale-[0.92] ${
          isOpen
            ? 'bg-gray-800 text-white rotate-90'
            : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-premium-2xl'
        }`}
        aria-label="Chat"
      >
        {isOpen ? <FiX size={22} /> : <FiMessageSquare size={22} />}
      </button>

      {/* ─═ Floating Chat Panel ═─ */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-6 z-[100] w-[380px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-8rem)] card-double-bezel transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        <div className="card-inner p-0 flex flex-col h-full overflow-hidden">
          {/* ── Header ── */}
          <div className="px-4 pt-4 pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center ring-1 ring-primary-200/50">
                  <FiMessageSquare className="text-primary-600 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Hỗ trợ</p>
                  <p className="text-[9px] text-ink-tertiary">Trò chuyện với shop & AI</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {selectedConv && activeTab === 'shop' && (
                  <button
                    onClick={() => { setSelectedConv(null); setMessages([]); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-secondary transition-all"
                    title="Quay lại danh sách"
                  >
                    <FiArrowLeft size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1">
              <button
                onClick={() => { setActiveTab('shop'); setSelectedConv(null); setMessages([]); }}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'shop'
                    ? 'bg-primary-600 text-white shadow-premium-sm'
                    : 'text-ink-secondary hover:text-ink hover:bg-surface-secondary'
                }`}
              >
                <FiMessageSquare className="inline mr-1.5 text-[11px]" />
                Shop
              </button>
              <button
                onClick={() => { setActiveTab('ai'); }}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'ai'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-premium-sm'
                    : 'text-ink-secondary hover:text-ink hover:bg-surface-secondary'
                }`}
              >
                <FiZap className="inline mr-1.5 text-[11px]" />
                AI
              </button>
            </div>
          </div>

          {/* ══════════ SHOP TAB ══════════ */}
          {activeTab === 'shop' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {!isAuthenticated ? (
                <div className="flex-1 flex items-center justify-center text-center px-6">
                  <div>
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <FiUser className="text-xl text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-ink mb-1">Đăng nhập để chat</p>
                    <p className="text-xs text-ink-tertiary mb-4">Đăng nhập để liên hệ với shop</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all active:scale-[0.97]"
                    >
                      Đăng nhập
                    </button>
                  </div>
                </div>
              ) : selectedConv ? (
                <>
                  {/* Chat header */}
                  <div className="px-4 py-2.5 bg-surface-secondary border-b border-gray-100 flex items-center space-x-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center ring-1 ring-emerald-200/50">
                      <span className="text-xs font-bold text-emerald-600">
                        {selectedConv.partner?.storeName?.[0] || selectedConv.partner?.name?.[0] || 'S'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink truncate">
                        {selectedConv.partner?.storeName || selectedConv.partner?.name}
                      </p>
                      {selectedConv.orderId && (
                        <p className="text-[10px] text-ink-tertiary">Đơn hàng #{selectedConv.orderId.slice(0, 8)}</p>
                      )}
                    </div>
                    {!isPartner && (
                      <button
                        onClick={() => navigate(`/chat`)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-tertiary hover:text-primary-600 hover:bg-primary-50 transition-all"
                        title="Mở to"
                      >
                        <FiExternalLink size={12} />
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {messages.map((msg) => {
                      const isMine = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? 'bg-primary-600 text-white rounded-br-md'
                              : 'bg-surface-secondary text-ink rounded-bl-md border border-gray-100'
                          }`}>
                            <p>{msg.content}</p>
                            <p className={`text-[9px] mt-1 ${isMine ? 'text-white/60' : 'text-ink-tertiary'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {messages.length === 0 && (
                      <div className="text-center text-ink-tertiary text-xs py-8">
                        Chưa có tin nhắn. Hãy gửi lời chào!
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="card-double-bezel flex-1">
                        <div className="card-inner p-0 flex items-center">
                          <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-[12px] px-3 py-2.5 min-w-0"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={sending || !messageText.trim()}
                        className="w-9 h-9 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 transition-all active:scale-[0.92] shrink-0"
                      >
                        {sending ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <FiSend size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Conversation List */}
                  <div className="flex-1 overflow-y-auto">
                    {loadingConvs ? (
                      <div className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center space-x-3">
                            <div className="w-9 h-9 skeleton-bg rounded-xl" />
                            <div className="space-y-2 flex-1">
                              <div className="h-3 w-28 skeleton-bg rounded" />
                              <div className="h-2.5 w-36 skeleton-bg rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-center px-8 py-12">
                        <div>
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <FiMessageSquare className="text-xl text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-ink mb-1">Chưa có hội thoại</p>
                          <p className="text-xs text-ink-tertiary mb-4">
                            Khi bạn đặt hàng, bạn có thể chat với shop tại đây
                          </p>
                          {!isPartner && (
                            <button
                              onClick={() => navigate('/orders')}
                              className="px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all active:scale-[0.97]"
                            >
                              Xem đơn hàng
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {conversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => selectConversation(conv)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-secondary transition-all duration-200"
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ${
                                isPartner
                                  ? 'bg-gradient-to-br from-primary-50 to-primary-100 ring-primary-200/50'
                                  : 'bg-gradient-to-br from-emerald-50 to-emerald-100 ring-emerald-200/50'
                              }`}>
                                <span className={`text-xs font-bold ${
                                  isPartner ? 'text-primary-600' : 'text-emerald-600'
                                }`}>
                                  {(isPartner ? conv.user?.name?.[0] : conv.partner?.storeName?.[0] || conv.partner?.name?.[0]) || '?'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-ink truncate">
                                    {isPartner ? conv.user?.name : conv.partner?.storeName || conv.partner?.name}
                                  </p>
                                  {conv._count?.messages > 0 && (
                                    <span className="text-[9px] text-ink-tertiary ml-2 shrink-0">
                                      {conv._count.messages} unread
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-ink-tertiary truncate mt-0.5">
                                  {conv.messages?.[0]?.content || 'Chưa có tin nhắn'}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════ AI TAB ══════════ */}
          {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiMessages.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-3 ring-1 ring-purple-200/50">
                      <FiZap className="text-xl text-purple-600" />
                    </div>
                    <p className="text-sm font-semibold text-ink mb-1">Trợ lý AI</p>
                    <p className="text-xs text-ink-tertiary mb-4">
                      Tôi có thể giúp bạn tìm sản phẩm, kiểm tra thông tin đơn hàng, và nhiều hơn nữa!
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 max-w-[240px] mx-auto">
                      {['Tìm sản phẩm', 'Chính sách đổi trả', 'Khuyến mãi', 'Vận chuyển'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setAiMessages(prev => [...prev, { id: Date.now(), role: 'user', content: suggestion }]);
                            setAiTyping(true);
                            setTimeout(() => {
                              const response = getAIResponse(suggestion);
                              setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: response }]);
                              setAiTyping(false);
                            }, 600 + Math.random() * 400);
                          }}
                          className="px-3 py-1.5 text-[10px] font-medium bg-surface-secondary text-ink-secondary rounded-xl hover:bg-surface-tertiary hover:text-ink transition-all border border-gray-200 active:scale-[0.97]"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && (
                      <div className="w-7 h-7 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center shrink-0 mr-2 mt-0.5 ring-1 ring-purple-200/50">
                        <FiZap className="text-[11px] text-purple-600" />
                      </div>
                    )}
                    <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-surface-secondary text-ink rounded-bl-md border border-gray-100'
                    }`}>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center shrink-0 mr-2 mt-0.5 ring-1 ring-purple-200/50">
                      <FiZap className="text-[11px] text-purple-600" />
                    </div>
                    <div className="bg-surface-secondary border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={aiMessagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="card-double-bezel flex-1">
                    <div className="card-inner p-0 flex items-center">
                      <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAISend()}
                        placeholder="Hỏi trợ lý AI..."
                        className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-[12px] px-3 py-2.5 min-w-0"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAISend}
                    disabled={aiTyping || !aiInput.trim()}
                    className="w-9 h-9 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl flex items-center justify-center hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 transition-all active:scale-[0.92] shrink-0"
                  >
                    {aiTyping ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiZap size={14} />
                    )}
                  </button>
                </div>
                {!isAuthenticated && (
                  <p className="text-[9px] text-ink-tertiary text-center mt-2">
                    <button onClick={() => navigate('/login')} className="text-primary-600 hover:underline">Đăng nhập</button> để chat với shop
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatFloating;
