import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const askAI = async (message, messageHistory) => {
  try {
    const { data } = await api.post('/chat/ai', {
      question: message,
      messages: messageHistory.length > 0
        ? messageHistory.slice(-10).map(m => ({ role: m.role, content: m.content }))
        : undefined,
    });
    return data.data?.answer || 'Xin lỗi, tôi không thể trả lời ngay lúc này.';
  } catch (err) {
    return 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.';
  }
};

const ChatFloating = ({ navigation }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');

  // AI Chat
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [aiMessages, aiTyping]);

  const handleAISend = useCallback(async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    const history = [...aiMessages];
    setAiInput('');
    setAiMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMsg }]);
    setAiTyping(true);
    const response = await askAI(userMsg, history);
    setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: response }]);
    setAiTyping(false);
  }, [aiInput, aiMessages]);

  const suggestions = ['Tìm sản phẩm', 'Chính sách đổi trả', 'Khuyến mãi', 'Vận chuyển'];

  const handleSuggestion = async (suggestion) => {
    const history = [...aiMessages];
    setAiMessages(prev => [...prev, { id: Date.now(), role: 'user', content: suggestion }]);
    setAiTyping(true);
    const response = await askAI(suggestion, history);
    setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: response }]);
    setAiTyping(false);
  };

  const renderAIMessage = ({ item }) => (
    <View style={[styles.msgRow, item.role === 'user' && styles.msgRowUser]}>
      {item.role === 'ai' && (
        <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>🤖</Text></View>
      )}
      <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.msgText, item.role === 'user' && styles.userMsgText]}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <>
      {/* Floating Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>💬</Text>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal visible={isOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.chatPanel}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerIcon}>💬</Text>
                <View>
                  <Text style={styles.headerTitle}>Hỗ trợ</Text>
                  <Text style={styles.headerSub}>Trò chuyện với AI & Shop</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'ai' && styles.tabAIActive]}
                onPress={() => setActiveTab('ai')}
              >
                <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>🤖 AI</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'shop' && styles.tabShopActive]}
                onPress={() => setActiveTab('shop')}
              >
                <Text style={[styles.tabText, activeTab === 'shop' && styles.tabTextActive]}>🏪 Shop</Text>
              </TouchableOpacity>
            </View>

            {/* AI Tab */}
            {activeTab === 'ai' && (
              <View style={styles.chatBody}>
                <FlatList
                  ref={flatListRef}
                  data={aiMessages}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={styles.messagesList}
                  renderItem={renderAIMessage}
                  ListEmptyComponent={
                    <View style={styles.emptyChat}>
                      <Text style={styles.emptyIcon}>🤖</Text>
                      <Text style={styles.emptyTitle}>Trợ lý AI</Text>
                      <Text style={styles.emptyDesc}>Tôi có thể giúp bạn tìm sản phẩm, kiểm tra thông tin đơn hàng!</Text>
                      <View style={styles.suggestionsRow}>
                        {suggestions.map(s => (
                          <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => handleSuggestion(s)}>
                            <Text style={styles.suggestionText}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  }
                  ListFooterComponent={
                    aiTyping ? (
                      <View style={[styles.msgRow]}>
                        <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>🤖</Text></View>
                        <View style={[styles.aiBubble, styles.typingBubble]}>
                          <Text style={styles.typingText}>...</Text>
                        </View>
                      </View>
                    ) : null
                  }
                />

                {/* Input */}
                <View style={styles.inputBar}>
                  <TextInput
                    style={styles.input}
                    value={aiInput}
                    onChangeText={setAiInput}
                    placeholder="Hỏi trợ lý AI..."
                    placeholderTextColor="#94a3b8"
                    onSubmitEditing={handleAISend}
                    returnKeyType="send"
                  />
                  <TouchableOpacity style={styles.sendBtn} onPress={handleAISend} disabled={aiTyping || !aiInput.trim()}>
                    <Text style={styles.sendBtnText}>➤</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Shop Tab */}
            {activeTab === 'shop' && (
              <View style={styles.chatBody}>
                {!isAuthenticated ? (
                  <View style={styles.emptyChat}>
                    <Text style={styles.emptyIcon}>🔒</Text>
                    <Text style={styles.emptyTitle}>Đăng nhập để chat</Text>
                    <Text style={styles.emptyDesc}>Đăng nhập để liên hệ với shop</Text>
                    <TouchableOpacity style={styles.loginBtn} onPress={() => { setIsOpen(false); navigation?.navigate('Login'); }}>
                      <Text style={styles.loginBtnText}>Đăng nhập</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyChat}>
                    <Text style={styles.emptyIcon}>💬</Text>
                    <Text style={styles.emptyTitle}>Chat với Shop</Text>
                    <Text style={styles.emptyDesc}>Vào phần Tin nhắn để xem hội thoại</Text>
                    <TouchableOpacity style={styles.loginBtn} onPress={() => { setIsOpen(false); navigation?.navigate('Chat'); }}>
                      <Text style={styles.loginBtnText}>Mở tin nhắn</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 16, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', zIndex: 1000, elevation: 8, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  fabIcon: { fontSize: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  chatPanel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', maxHeight: 600 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { fontSize: 24 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },
  headerSub: { fontSize: 11, color: '#94a3b8' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14, color: '#64748b' },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#f1f5f9' },
  tabAIActive: { backgroundColor: '#7c3aed' },
  tabShopActive: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },

  chatBody: { flex: 1 },
  messagesList: { padding: 16, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  msgRowUser: { justifyContent: 'flex-end' },
  aiAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  aiAvatarText: { fontSize: 14 },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  aiBubble: { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  msgText: { fontSize: 14, color: '#1e293b', lineHeight: 20 },
  userMsgText: { color: '#fff' },
  typingBubble: { paddingVertical: 10, paddingHorizontal: 16 },
  typingText: { fontSize: 20, color: '#94a3b8' },

  emptyChat: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  suggestionChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  suggestionText: { fontSize: 12, color: '#475569' },
  loginBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 18 },
});

export default ChatFloating;
