import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  RefreshControl, ActivityIndicator, Modal, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminCouponsScreen = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const [form, setForm] = useState({
    code: '', type: 'PERCENTAGE', value: '', minOrderValue: '', maxDiscount: '',
    usageLimit: '', perUserLimit: '1', startsAt: '', expiresAt: '',
    description: '', isActive: true,
  });

  const fetchCoupons = useCallback(async () => {
    try {
      const params = { limit: 10, page };
      if (search) params.search = search;
      if (filter === 'active') params.isActive = true;
      else if (filter === 'inactive') params.isActive = false;
      const { data } = await api.get('/coupons', { params });
      setCoupons(data.data.coupons);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải mã giảm giá' });
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

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
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : '', description: c.description || '', isActive: c.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.value || parseFloat(form.value) <= 0) { Toast.show({ type: 'error', text1: 'Nhập giá trị giảm giá' }); return; }
    if (form.type === 'PERCENTAGE' && (parseFloat(form.value) < 0 || parseFloat(form.value) > 100)) { Toast.show({ type: 'error', text1: '% từ 0-100' }); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value),
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        perUserLimit: parseInt(form.perUserLimit),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };
      if (editing) {
        await api.put(`/coupons/${editing.id}`, payload);
        Toast.show({ type: 'success', text1: 'Đã cập nhật' });
      } else {
        await api.post('/coupons', payload);
        Toast.show({ type: 'success', text1: 'Đã tạo mã giảm giá' });
      }
      setShowModal(false);
      fetchCoupons();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Xoá mã giảm giá', 'Xoá mã này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        try { await api.delete(`/coupons/${id}`); Toast.show({ type: 'success', text1: 'Đã xoá' }); fetchCoupons(); }
        catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
      }},
    ]);
  };

  const handleToggle = async (c) => {
    try {
      await api.put(`/coupons/${c.id}`, { isActive: !c.isActive });
      Toast.show({ type: 'success', text1: c.isActive ? 'Đã vô hiệu hoá' : 'Đã kích hoạt' });
      fetchCoupons();
    } catch (err) { Toast.show({ type: 'error', text1: 'Thất bại' }); }
  };

  const now = new Date();

  const renderCoupon = ({ item: c }) => {
    const isExpired = c.expiresAt && new Date(c.expiresAt) < now;
    const isPending = c.startsAt && new Date(c.startsAt) > now;
    const statusText = !c.isActive ? 'Tạm dừng' : isExpired ? 'Hết hạn' : isPending ? 'Sắp diễn ra' : 'Đang hoạt động';
    return (
      <View style={styles.couponCard}>
        <View style={styles.couponRow}>
          <Text style={styles.couponCode}>{c.code}</Text>
          <TouchableOpacity onPress={() => handleToggle(c)}>
            <Text style={{ fontSize: 18 }}>{c.isActive ? '✅' : '⏸️'}</Text>
          </TouchableOpacity>
        </View>
        {c.description && <Text style={styles.couponDesc}>{c.description}</Text>}
        <View style={styles.couponDetails}>
          <View style={styles.couponDetail}>
            <Text style={styles.detailLabel}>Giảm</Text>
            <Text style={styles.detailValue}>{c.type === 'PERCENTAGE' ? `${c.value}%` : `${c.value.toLocaleString('vi-VN')}₫`}</Text>
          </View>
          <View style={styles.couponDetail}>
            <Text style={styles.detailLabel}>Đã dùng</Text>
            <Text style={styles.detailValue}>{c.usedCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}</Text>
          </View>
          <View style={styles.couponDetail}>
            <Text style={styles.detailLabel}>Trạng thái</Text>
            <Text style={[styles.detailValue, {
              color: statusText === 'Đang hoạt động' ? '#059669' : statusText === 'Sắp diễn ra' ? '#D97706' : '#EF4444'
            }]}>{statusText}</Text>
          </View>
        </View>
        {c.minOrderValue > 0 && <Text style={styles.minOrder}>Đơn tối thiểu: {c.minOrderValue.toLocaleString('vi-VN')}₫</Text>}
        <View style={styles.couponActions}>
          <TouchableOpacity style={styles.editCouponBtn} onPress={() => openEdit(c)}>
            <Text>✏️ Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteCouponBtn} onPress={() => handleDelete(c.id)}>
            <Text>🗑️ Xoá</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý mã giảm giá</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Tạo mã</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={search} onChangeText={setSearch} placeholder="Tìm mã..." onSubmitEditing={() => setPage(1)} />
        <View style={styles.filterTabs}>
          {['all', 'active', 'inactive'].map((f) => (
            <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.activeFilter]} onPress={() => { setFilter(f); setPage(1); }}>
              <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>{f === 'all' ? 'Tất cả' : f === 'active' ? 'Hoạt động' : 'Tạm dừng'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={coupons}
          renderItem={renderCoupon}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchCoupons} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>🎫</Text><Text style={styles.emptyText}>Không có mã giảm giá</Text></View>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}>
                  <Text>◀</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: '#475569' }}>{page}/{totalPages}</Text>
                <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={[styles.pageBtn, page === totalPages && { opacity: 0.4 }]}>
                  <Text>▶</Text>
                </TouchableOpacity>
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
            <Text style={styles.label}>Mã giảm giá</Text>
            <TextInput style={[styles.input, { textTransform: 'uppercase' }]} value={form.code} onChangeText={(t) => setForm({ ...form, code: t })} editable={!editing} placeholder="SUMMER2024" />
            <Text style={styles.label}>Loại</Text>
            <View style={styles.typeRow}>
              {['PERCENTAGE', 'FIXED'].map((t) => (
                <TouchableOpacity key={t} style={[styles.typeBtn, form.type === t && styles.typeBtnActive]} onPress={() => setForm({ ...form, type: t })}>
                  <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{t === 'PERCENTAGE' ? '% Phần trăm' : '₫ Tiền mặt'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{form.type === 'PERCENTAGE' ? 'Phần trăm giảm' : 'Số tiền giảm'}</Text>
            <TextInput style={styles.input} value={form.value} onChangeText={(t) => setForm({ ...form, value: t })} keyboardType="numeric" />
            {form.type === 'PERCENTAGE' && (
              <>
                <Text style={styles.label}>Giảm tối đa (₫)</Text>
                <TextInput style={styles.input} value={form.maxDiscount} onChangeText={(t) => setForm({ ...form, maxDiscount: t })} keyboardType="numeric" />
              </>
            )}
            <Text style={styles.label}>Đơn tối thiểu (₫)</Text>
            <TextInput style={styles.input} value={form.minOrderValue} onChangeText={(t) => setForm({ ...form, minOrderValue: t })} keyboardType="numeric" />
            <Text style={styles.label}>Giới hạn lượt dùng</Text>
            <TextInput style={styles.input} value={form.usageLimit} onChangeText={(t) => setForm({ ...form, usageLimit: t })} keyboardType="numeric" />
            <Text style={styles.label}>Lượt/người</Text>
            <TextInput style={styles.input} value={form.perUserLimit} onChangeText={(t) => setForm({ ...form, perUserLimit: t })} keyboardType="numeric" />
            <Text style={styles.label}>Bắt đầu (YYYY-MM-DDTHH:mm)</Text>
            <TextInput style={styles.input} value={form.startsAt} onChangeText={(t) => setForm({ ...form, startsAt: t })} />
            <Text style={styles.label}>Kết thúc</Text>
            <TextInput style={styles.input} value={form.expiresAt} onChangeText={(t) => setForm({ ...form, expiresAt: t })} />
            <Text style={styles.label}>Mô tả</Text>
            <TextInput style={[styles.input, { height: 60 }]} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Kích hoạt ngay</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  addBtn: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  filterRow: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 10 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 13, color: '#1E293B', marginBottom: 8 },
  filterTabs: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  activeFilter: { backgroundColor: '#3B82F6' },
  filterText: { fontSize: 12, color: '#64748B' },
  activeFilterText: { color: '#fff' },
  list: { padding: 12, paddingBottom: 32 },
  couponCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  couponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  couponCode: { fontSize: 16, fontWeight: '700', color: '#3B82F6', fontFamily: 'monospace', letterSpacing: 1 },
  couponDesc: { fontSize: 12, color: '#64748B', marginTop: 4 },
  couponDetails: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  couponDetail: { flex: 1 },
  detailLabel: { fontSize: 10, color: '#94A3B8' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 2 },
  minOrder: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  couponActions: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  editCouponBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#EFF6FF', borderRadius: 8 },
  deleteCouponBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FEE2E2', borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalScroll: { flex: 1 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalClose: { fontSize: 20, color: '#94A3B8', padding: 4 },
  label: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 4, marginTop: 8 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#3B82F6' },
  typeBtnText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  typeBtnTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  switchLabel: { fontSize: 14, color: '#475569' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default AdminCouponsScreen;
