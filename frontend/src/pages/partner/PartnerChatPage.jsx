import React, { useState, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiUser, FiArrowLeft } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const PartnerChatPage = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.data);
    } catch (err) { toast.error('Không thể tải hội thoại'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConversations(); }, []);

  const fetchMessages = async (convId) => {
    try {
      const { data } = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(data.data);
    } catch (err) { toast.error('Không thể tải tin nhắn'); }
  };

  const selectConversation = (conv) => {
    setSelectedConv(conv);
    fetchMessages(conv.id);
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/conversations/${selectedConv.id}/messages`, { content: messageText.trim() });
      setMessages(prev => [...prev, data.data]);
      setMessageText('');
      fetchConversations();
    } catch (err) { toast.error('Gửi tin nhắn thất bại'); }
    finally { setSending(false); }
  };

  if (loading) return <LoadingSpinner />;

  const isMobile = window.innerWidth < 768;
  const showConvList = !selectedConv || !isMobile;
  const showChat = selectedConv && (!isMobile || true);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-2xl border border-gray-100 shadow-premium-sm overflow-hidden">
      {/* Conversation List */}
      {(showConvList) && (
        <div className={`${isMobile ? 'w-full' : 'w-80'} border-r border-gray-100 flex flex-col ${showChat && isMobile ? 'hidden' : ''}`}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-ink">Hội thoại</h2>
            <p className="text-xs text-ink-tertiary mt-0.5">{conversations.length} cuộc trò chuyện</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button key={conv.id} onClick={() => selectConversation(conv)}
                className={`w-full text-left p-4 border-b border-gray-50 hover:bg-surface-secondary transition-colors ${selectedConv?.id === conv.id ? 'bg-primary-50' : ''}`}>
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary-600">{conv.user?.name?.[0] || '?'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-ink truncate">{conv.user?.name}</p>
                      {conv._count?.messages > 0 && (
                        <span className="text-[10px] text-ink-tertiary">{conv._count.messages} tin</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-tertiary truncate mt-0.5">
                      {conv.messages?.[0]?.content || 'Chưa có tin nhắn'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-ink-tertiary text-sm">
                <FiMessageSquare className="text-2xl mx-auto mb-2" />
                Chưa có hội thoại nào
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      {(showChat || selectedConv) && (
        <div className={`flex-1 flex flex-col ${!selectedConv ? 'items-center justify-center text-ink-tertiary' : ''}`}>
          {selectedConv ? (
            <>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center space-x-3">
                {isMobile && (
                  <button onClick={() => setSelectedConv(null)} className="p-1.5 hover:bg-surface-secondary rounded-xl transition-colors">
                    <FiArrowLeft />
                  </button>
                )}
                <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-600">{selectedConv.user?.name?.[0] || '?'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{selectedConv.user?.name}</p>
                  {selectedConv.orderId && (
                    <p className="text-[11px] text-ink-tertiary">Đơn hàng #{selectedConv.orderId.slice(0, 8)}</p>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderId === selectedConv.partnerId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.senderId === selectedConv.partnerId
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-ink rounded-bl-md'
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.senderId === selectedConv.partnerId ? 'text-white/70' : 'text-ink-tertiary'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-ink-tertiary text-sm py-12">
                    Chưa có tin nhắn. Hãy gửi lời chào!
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Nhập tin nhắn..." className="input-field flex-1" />
                  <button onClick={handleSend} disabled={sending || !messageText.trim()}
                    className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 transition-all">
                    <FiSend size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <FiMessageSquare className="text-4xl mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">Chọn một hội thoại</p>
              <p className="text-xs mt-1">Nhấn vào cuộc trò chuyện bên trái để xem tin nhắn</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnerChatPage;
