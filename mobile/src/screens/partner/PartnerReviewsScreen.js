import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const RATING_COLORS = { 5: '#059669', 4: '#65A30D', 3: '#D97706', 2: '#EA580C', 1: '#EF4444' };

const PartnerReviewsScreen = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  const fetchReviews = useCallback(async () => {
    try {
      const { data } = await api.get(`/reviews/partner?page=${page}&limit=10`);
      setReviews(data.data.reviews);
      setStats(data.data.stats);
      setTotalPages(data.data.pagination.totalPages);
    } catch { Toast.show({ type: 'error', text1: 'Không thể tải đánh giá' }); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleReply = async (reviewId) => {
    if (!replyText[reviewId]?.trim()) { Toast.show({ type: 'error', text1: 'Nhập nội dung phản hồi' }); return; }
    try {
      await api.put(`/reviews/${reviewId}/reply`, { reply: replyText[reviewId] });
      Toast.show({ type: 'success', text1: 'Đã phản hồi đánh giá' });
      setReplyingTo(null);
      setReplyText(prev => { const next = { ...prev }; delete next[reviewId]; return next; });
      fetchReviews();
    } catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
  };

  const renderReview = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.user?.name?.[0] || '?'}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.user?.name || 'Người dùng'}</Text>
            <Text style={styles.productName} numberOfLines={1}>{item.product?.name}</Text>
          </View>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Text key={star} style={{ fontSize: 14 }}>{star <= item.rating ? '⭐' : '☆'}</Text>
            ))}
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
          </View>
        </View>
      </View>

      {item.comment && <View style={styles.commentBox}><Text style={styles.commentText}>{item.comment}</Text></View>}

      {item.reply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>Phản hồi của bạn:</Text>
          <Text style={styles.replyContent}>{item.reply}</Text>
        </View>
      ) : replyingTo === item.id ? (
        <View style={styles.replyForm}>
          <TextInput style={styles.replyInput} value={replyText[item.id] || ''}
            onChangeText={(t) => setReplyText(prev => ({ ...prev, [item.id]: t }))}
            placeholder="Nhập phản hồi..." multiline />
          <View style={styles.replyActions}>
            <TouchableOpacity style={styles.sendBtn} onPress={() => handleReply(item.id)}>
              <Text style={styles.sendBtnText}>📨 Gửi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelReplyBtn} onPress={() => setReplyingTo(null)}>
              <Text style={styles.cancelReplyText}>Huỷ</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.replyBtn} onPress={() => setReplyingTo(item.id)}>
          <Text style={styles.replyBtnText}>💬 Phản hồi</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const ratingDist = stats?.ratingDistribution || {};
  const totalReviews = stats?.totalReviews || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>⭐ Đánh giá sản phẩm</Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>{stats.averageRating?.toFixed(1)}</Text>
            <Text style={styles.statLabel}>TB</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💬</Text>
            <Text style={styles.statValue}>{stats.totalReviews}</Text>
            <Text style={styles.statLabel}>Tổng</Text>
          </View>
          <View style={[styles.statCard, { flex: 1.5 }]}>
            <Text style={styles.statLabel}>Phân bố</Text>
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingDist[star] || 0;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <View key={star} style={styles.distRow}>
                  <Text style={styles.distStar}>{star}</Text>
                  <View style={styles.distBar}>
                    <View style={[styles.distFill, { width: `${pct}%`, backgroundColor: RATING_COLORS[star] }]} />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color="#059669" style={{ marginTop: 20 }} /> : (
        <FlatList
          data={reviews}
          renderItem={renderReview}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có đánh giá nào</Text>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}><Text>◀</Text></TouchableOpacity>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <TouchableOpacity key={p} onPress={() => setPage(p)} style={[styles.pageNum, p === page && styles.pageNumActive]}>
                    <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={[styles.pageBtn, page === totalPages && { opacity: 0.4 }]}><Text>▶</Text></TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  statCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, alignItems: 'center' },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  statLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, width: '100%' },
  distStar: { fontSize: 10, color: '#64748B', width: 12 },
  distBar: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 3 },
  distCount: { fontSize: 9, color: '#94A3B8', width: 16, textAlign: 'right' },
  list: { padding: 12, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  reviewHeader: { flexDirection: 'row' },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#3B82F6' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between' },
  userName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  productName: { fontSize: 11, color: '#94A3B8', maxWidth: 140 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 2 },
  date: { fontSize: 10, color: '#94A3B8', marginLeft: 8 },
  commentBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginTop: 10 },
  commentText: { fontSize: 13, color: '#475569', fontStyle: 'italic' },
  replyBox: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#059669' },
  replyLabel: { fontSize: 11, fontWeight: '600', color: '#059669', marginBottom: 4 },
  replyContent: { fontSize: 13, color: '#475569' },
  replyForm: { marginTop: 10 },
  replyInput: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#E2E8F0', color: '#1E293B', minHeight: 40 },
  replyActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sendBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  cancelReplyBtn: { paddingHorizontal: 12, justifyContent: 'center' },
  cancelReplyText: { fontSize: 12, color: '#64748B' },
  replyBtn: { marginTop: 8, paddingVertical: 6 },
  replyBtnText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 16, flexWrap: 'wrap' },
  pageBtn: { padding: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  pageNum: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  pageNumActive: { backgroundColor: '#059669', borderColor: '#059669' },
  pageNumText: { fontSize: 13, color: '#475569' },
  pageNumTextActive: { color: '#fff' },
});

export default PartnerReviewsScreen;
