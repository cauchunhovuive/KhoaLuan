import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  ActivityIndicator, Modal, ScrollView, Switch, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const PartnerCouponsScreen = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '', type: 'PERCENTAGE', value: '', minOrderValue: '', maxDiscount: '',
    usageLimit: '', perUserLimit: '1', startsAt: '', expiresAt: '', description: '', isActive: true,
  });

  const fetchCoupons = useCallback(async () => {
    try {
      const { data } = await api.get(`/coupons/my?page=${page}&limit=10`);
      setCoupons(data.data.coupons);
      setTotalPages(data.data.pagination.totalPages);
    } catch { Toast.show({ type: 'error', text1: 'Không thể tải mã giảm giá' }); }
    finally { setLoading(false); setRefreshing(false); }
  }, [page]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', type: 'PERCENTAGE', value: '', minOrderValue: '', maxDiscount: '', usageLimit: '', perUserLimit: '1', startsAt: '', expiresAt: '', description: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code, type: c.type, value: String(c.value), minOrderValue: c.minOrderValue ? String(c.minOrderValue) : '',
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '', usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      perUserLimit: String(c.perUserLimit || 1), startsAt: c.startsAt ? new Date(c.startsAt).toISOString().slice(0, 16) : '',
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : '',
      description: c.description || '', isActive: c.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.value || parseFloat(form.value) <= 0) { Toast.show({ type: 'error', text1: 'Nhập giá trị giảm giá' }); return; }
    if (form.type === 'PERCENTAGE' && (parseFloat(form.value) < 0 || parseFloat(form.value) > 100)) { Toast.show({ type: 'error', text1: '% từ 0-100' }); return; }
    setSaving(true);
    try {
      const payload = {
        ...form, value: parseFloat(form.value),
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        perUserLimit: parseInt(form.perUserLimit),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };
      if (editing) { await api.put(`/coupons/${editing.id}`, payload); Toast.show({ type: 'success', text1: 'Đã cập nhật' }); }
      else { await api.post('/coupons', payload); Toast.show({ type: 'success', text1: 'Đã tạo mã giảm giá' }); }
      setShowModal(false);
      fetchCoupons();
    } catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Xoá mã', 'Xoá mã giảm giá này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        try { await api.delete(`/coupons/${id}`); Toast.show({ type: 'success', text1: 'Đã xoá' }); fetchCoupons(); }
        catch { Toast.show({ type: 'error', text1: 'Lỗi' }); }
      }},
    ]);
  };

  const handleToggle = async (c) => {
    try { await api.put(`/coupons/${c.id}`, { isActive: !c.isActive }); Toast.show({ type: 'success', text1: c.isActive ? 'Đã tạm dừng' : 'Đã kích hoạt' }); fetchCoupons(); }
    catch { Toast.show({ type: 'error', text1: 'Lỗi' }); }
  };

  const now = new Date();
  const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🎫 Mã giảm giá</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Tạo mã</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{coupons.length}</Text>
          <Text style={styles.statLabel}>Tổng mã</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#059669' }]}>{coupons.filter(c => c.isActive).length}</Text>
          <Text style={styles.statLabel}>Đang hoạt động</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalUsed}</Text>
          <Text style={styles.statLabel}>Lượt dùng</Text>
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#059669" style={{ marginTop: 20 }} /> : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCoupons(); }} />}
          renderItem={({ item: c }) => {
            const isExpired = c.expiresAt && new Date(c.expiresAt) < now;
            const isPending = c.startsAt && new Date(c.startsAt) > now;
            const statusText = !c.isActive ? 'Tạm dừng' : isExpired ? 'Hết hạn' : isPending ? 'Sắp diễn ra' : 'Đang hoạt động';
            return (
              <View style={styles.couponCard}>
                <View style={styles.couponRow}>
                  <View style={[styles.badgeBox, { backgroundColor: c.type === 'PERCENTAGE' ? '#3B82F6' : '#059669' }]}>
                    <Text style={styles.badgeValue}>{c.type === 'PERCENTAGE' ? `${c.value}%` : `${(c.value/1000).toFixed(0)}K`}</Text>
                    <Text style={styles.badgeLabel}>GIẢM</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={styles.codeRow}>
                      <Text style={styles.code}>{c.code}</Text>
                      <View style={[styles.statusDot, { backgroundColor: statusText === 'Đang hoạt động' ? '#059669' : statusText === 'Tạm dừng' ? '#D97706' : '#EF4444' }]} />
                    </View>
                    {c.description && <Text style={styles.desc}>{c.description}</Text>}
                    <Text style={styles.used}>Đã dùng: {c.usedCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.toggleBtn} onPress={() => handleToggle(c)}>
                    <Text style={styles.toggleBtnText}>{c.isActive ? '⏸️ Tạm dừng' : '▶️ Kích hoạt'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(c)}>
                    <Text>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(c.id)}>
                    <Text>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có mã giảm giá</Text>}
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

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.label}>Mã (để trống tự tạo)</Text>
            <TextInput style={[styles.input, { textTransform: 'uppercase' }]} value={form.code} onChangeText={(t) => setForm({ ...form, code: t })} editable={!editing} />
            <Text style={styles.label}>Loại</Text>
            <View style={styles.typeRow}>
              {['PERCENTAGE', 'FIXED'].map(t => (
                <TouchableOpacity key={t} style={[styles.typeBtn, form.type === t && styles.typeBtnActive]} onPress={() => setForm({ ...form, type: t })}>
                  <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{t === 'PERCENTAGE' ? '%' : '₫'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{form.type === 'PERCENTAGE' ? 'Phần trăm' : 'Số tiền'}</Text>
            <TextInput style={styles.input} value={form.value} onChangeText={(t) => setForm({ ...form, value: t })} keyboardType="numeric" />
            {form.type === 'PERCENTAGE' && (
              <><Text style={styles.label}>Giảm tối đa (₫)</Text><TextInput style={styles.input} value={form.maxDiscount} onChangeText={(t) => setForm({ ...form, maxDiscount: t })} keyboardType="numeric" /></>
            )}
            <Text style={styles.label}>Đơn tối thiểu (₫)</Text>
            <TextInput style={styles.input} value={form.minOrderValue} onChangeText={(t) => setForm({ ...form, minOrderValue: t })} keyboardType="numeric" />
            <Text style={styles.label}>Giới hạn lượt</Text>
            <TextInput style={styles.input} value={form.usageLimit} onChangeText={(t) => setForm({ ...form, usageLimit: t })} keyboardType="numeric" />
            <Text style={styles.label}>Bắt đầu (YYYY-MM-DDTHH:mm)</Text>
            <TextInput style={styles.input} value={form.startsAt} onChangeText={(t) => setForm({ ...form, startsAt: t })} />
            <Text style={styles.label}>Kết thúc</Text>
            <TextInput style={styles.input} value={form.expiresAt} onChangeText={(t) => setForm({ ...form, expiresAt: t })} />
            <Text style={styles.label}>Mô tả</Text>
            <TextInput style={[styles.input, { height: 60 }]} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline />
            <View style={styles.switchRow}>
              <Text>Kích hoạt ngay</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Huỷ</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}><Text style={styles.submitBtnText}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo mã'}</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView></View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  addBtn: { backgroundColor: '#059669', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  statItem: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  statLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  list: { padding: 12, paddingBottom: 40 },
  couponCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  couponRow: { flexDirection: 'row' },
  badgeBox: { width: 52, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeValue: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  badgeLabel: { fontSize: 8, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  code: { fontSize: 14, fontWeight: '700', color: '#1E293B', fontFamily: 'monospace' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  desc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  used: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  toggleBtn: { flex: 1, backgroundColor: '#F0FDF4', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  toggleBtnText: { fontSize: 11, color: '#059669', fontWeight: '600' },
  editBtn: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 8 },
  deleteBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 16, flexWrap: 'wrap' },
  pageBtn: { padding: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  pageNum: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  pageNumActive: { backgroundColor: '#059669', borderColor: '#059669' },
  pageNumText: { fontSize: 13, color: '#475569' },
  pageNumTextActive: { color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalClose: { fontSize: 20, color: '#94A3B8', padding: 4 },
  label: { fontSize: 12, fontWeight: '500', color: '#475569', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 13, color: '#1E293B' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#059669' },
  typeBtnText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  typeBtnTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#059669', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default PartnerCouponsScreen;
