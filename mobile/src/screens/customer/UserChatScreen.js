import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from 'react-native-toast-message';

const UserChatScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchConversations(); }, []);

  const fetchMessages = async (convId) => {
    try {
      const { data } = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(data.data || []);
    } catch {}
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
    } catch {} finally { setSending(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Tin nhắn</Text>
        <Text style={styles.subtitle}>{conversations.length} cuộc trò chuyện</Text>
      </View>

      <View style={styles.chatContainer}>
        {/* Conversations List */}
        <View style={styles.convList}>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.convItem, selectedConv?.id === item.id && styles.convItemActive]}
                onPress={() => selectConversation(item)}
              >
                <View style={styles.convAvatar}>
                  <Text style={styles.convAvatarText}>{item.partner?.storeName?.[0] || 'S'}</Text>
                </View>
                <View style={styles.convInfo}>
                  <Text style={styles.convName} numberOfLines={1}>{item.partner?.storeName}</Text>
                  <Text style={styles.convLastMsg} numberOfLines={1}>{item.messages?.[0]?.content || 'Chưa có tin nhắn'}</Text>
                </View>
                {item._count?.messages > 0 && (
                  <Text style={styles.convCount}>{item._count.messages}</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyConv}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>Chưa có hội thoại nào</Text>
              </View>
            }
          />
        </View>

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {selectedConv ? (
            <>
              <View style={styles.chatHeader}>
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>{selectedConv.partner?.storeName?.[0] || 'S'}</Text>
                </View>
                <View>
                  <Text style={styles.chatName}>{selectedConv.partner?.storeName}</Text>
                  {selectedConv.orderId && (
                    <Text style={styles.chatOrder}>Đơn hàng #{selectedConv.orderId.slice(0, 8)}</Text>
                  )}
                </View>
              </View>

              <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                renderItem={({ item }) => {
                  const isMe = item.senderId === selectedConv.userId;
                  return (
                    <View style={[styles.messageBubble, isMe ? styles.myMsg : styles.theirMsg]}>
                      <Text style={[styles.msgText, isMe && styles.myMsgText]}>{item.content}</Text>
                      <Text style={[styles.msgTime, isMe && styles.myMsgTime]}>
                        {new Date(item.createdAt).toLocaleTimeString('vi-VN')}
                      </Text>
                    </View>
                  );
                }}
                ListEmptyComponent={<Text style={styles.emptyMsg}>Hãy gửi tin nhắn cho shop!</Text>}
              />

              <View style={styles.inputBar}>
                <TextInput
                  style={styles.messageInput}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Nhập tin nhắn..."
                  placeholderTextColor="#94a3b8"
                  multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !messageText.trim()}>
                  {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Gửi</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noSelection}>
              <Text style={styles.noSelectIcon}>💬</Text>
              <Text style={styles.noSelectText}>Chọn hội thoại bên trái</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  chatContainer: { flex: 1, flexDirection: 'row' },
  convList: { width: '35%', borderRightWidth: 1, borderRightColor: '#e2e8f0', backgroundColor: '#fff' },
  convItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  convItemActive: { backgroundColor: '#dbeafe' },
  convAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  convAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  convInfo: { flex: 1 },
  convName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  convLastMsg: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  convCount: { fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  emptyConv: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#94a3b8' },

  chatArea: { flex: 1, backgroundColor: '#fff' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  chatAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  chatAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
  chatName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  chatOrder: { fontSize: 11, color: '#94a3b8' },
  messagesList: { padding: 16, flexGrow: 1 },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myMsg: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirMsg: { backgroundColor: '#f1f5f9', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: '#1e293b' },
  myMsgText: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#94a3b8', marginTop: 4, alignSelf: 'flex-end' },
  myMsgTime: { color: 'rgba(255,255,255,0.7)' },
  emptyMsg: { textAlign: 'center', color: '#94a3b8', paddingVertical: 40 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8 },
  messageInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 80, borderWidth: 1, borderColor: '#e2e8f0' },
  sendBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  noSelection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noSelectIcon: { fontSize: 40, marginBottom: 8 },
  noSelectText: { fontSize: 14, color: '#94a3b8' },
});

export default UserChatScreen;
