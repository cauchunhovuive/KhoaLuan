import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const PartnerChatScreen = () => {
  const { user } = useSelector((state) => state.auth);
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
    } catch { Toast.show({ type: 'error', text1: 'Không thể tải hội thoại' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConversations(); }, []);

  const fetchMessages = async (convId) => {
    try {
      const { data } = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(data.data || []);
    } catch { Toast.show({ type: 'error', text1: 'Không thể tải tin nhắn' }); }
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
    } catch { Toast.show({ type: 'error', text1: 'Gửi tin nhắn thất bại' }); }
    finally { setSending(false); }
  };

  if (loading) return <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />;

  if (selectedConv) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setSelectedConv(null)}>
            <Text style={styles.backBtn}>‹ Quay lại</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.chatName}>{selectedConv.user?.name || 'Khách hàng'}</Text>
            {selectedConv.orderId && (
              <Text style={styles.chatOrder}>Đơn hàng #{selectedConv.orderId.slice(0, 8)}</Text>
            )}
          </View>
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{selectedConv.user?.name?.[0] || '?'}</Text>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.id;
            return (
              <View style={[styles.msgBubble, isMine ? styles.myMsg : styles.theirMsg]}>
                <Text style={[styles.msgText, isMine && { color: '#fff' }]}>{item.content}</Text>
                <Text style={[styles.msgTime, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                  {new Date(item.createdAt).toLocaleTimeString('vi-VN')}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyMsg}>Chưa có tin nhắn. Hãy gửi lời chào!</Text>}
        />

        <View style={styles.inputBar}>
          <TextInput style={styles.messageInput} value={messageText} onChangeText={setMessageText}
            placeholder="Nhập tin nhắn..." placeholderTextColor="#94A3B8"                             />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !messageText.trim()}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>📨</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Tin nhắn</Text>
        <Text style={styles.subtitle}>{conversations.length} cuộc trò chuyện</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.convItem} onPress={() => selectConversation(item)}>
            <View style={styles.convAvatar}>
              <Text style={styles.convAvatarText}>{item.user?.name?.[0] || item.user?.email?.[0] || '?'}</Text>
            </View>
            <View style={styles.convInfo}>
              <View style={styles.convTopRow}>
                <Text style={styles.convName} numberOfLines={1}>{item.user?.name || item.user?.email}</Text>
                {item._count?.messages > 0 && (
                  <Text style={styles.convMsgCount}>{item._count.messages} tin</Text>
                )}
              </View>
              <Text style={styles.convLastMsg} numberOfLines={1}>{item.messages?.[0]?.content || 'Chưa có tin nhắn'}</Text>
              {item.orderId && (
                <Text style={styles.convOrderRef}>📦 Đơn #{item.orderId.slice(0, 8)}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyConv}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
            <Text style={styles.emptyConvText}>Chưa có hội thoại nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  list: { padding: 12 },
  convItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  convAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  convAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#3B82F6' },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1 },
  convMsgCount: { fontSize: 10, color: '#94A3B8', marginLeft: 8 },
  convLastMsg: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  convOrderRef: { fontSize: 11, color: '#059669', marginTop: 2, fontWeight: '500' },
  emptyConv: { alignItems: 'center', paddingVertical: 48 },
  emptyConvText: { fontSize: 15, color: '#94A3B8' },

  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  backBtn: { fontSize: 15, color: '#059669', fontWeight: '500' },
  chatName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  chatOrder: { fontSize: 11, color: '#059669', marginTop: 1 },
  chatAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  chatAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#3B82F6' },
  messagesList: { padding: 16, flexGrow: 1 },
  msgBubble: { maxWidth: '75%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myMsg: { backgroundColor: '#059669', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirMsg: { backgroundColor: '#F1F5F9', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: '#1E293B' },
  msgTime: { fontSize: 10, color: '#94A3B8', marginTop: 4, alignSelf: 'flex-end' },
  emptyMsg: { textAlign: 'center', color: '#94A3B8', paddingVertical: 40 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8, backgroundColor: '#fff' },
  messageInput: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E2E8F0', color: '#1E293B' },
  sendBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 18 },
});

export default PartnerChatScreen;
