import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Image,
  RefreshControl, ActivityIndicator, Modal, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminBannersScreen = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', subtitle: '', imageUrl: '', linkUrl: '', linkText: '',
    position: '0', bgColor: '', isActive: true,
  });

  const fetchBanners = useCallback(async () => {
    try {
      const { data } = await api.get('/banners/admin/all');
      setBanners(data.data);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải banner' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', subtitle: '', imageUrl: '', linkUrl: '', linkText: '', position: '0', bgColor: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || '', subtitle: b.subtitle || '', imageUrl: b.imageUrl || '',
      linkUrl: b.linkUrl || '', linkText: b.linkText || '', position: String(b.position ?? 0),
      bgColor: b.bgColor || '', isActive: b.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.imageUrl.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập URL hình ảnh' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, position: parseInt(form.position) || 0 };
      if (editing) {
        await api.put(`/banners/${editing.id}`, payload);
        Toast.show({ type: 'success', text1: 'Đã cập nhật banner' });
      } else {
        await api.post('/banners', payload);
        Toast.show({ type: 'success', text1: 'Đã tạo banner mới' });
      }
      setShowModal(false);
      fetchBanners();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Xoá banner', 'Xoá banner này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/banners/${id}`);
          Toast.show({ type: 'success', text1: 'Đã xoá banner' });
          fetchBanners();
        } catch (err) {
          Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
        }
      }},
    ]);
  };

  const handleToggle = async (b) => {
    try {
      await api.put(`/banners/${b.id}`, { isActive: !b.isActive });
      Toast.show({ type: 'success', text1: b.isActive ? 'Đã ẩn' : 'Đã hiện' });
      fetchBanners();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Thất bại' });
    }
  };

  const renderBanner = ({ item: b }) => (
    <View style={[styles.bannerCard, !b.isActive && styles.inactive]}>
      <Image
        source={{ uri: b.imageUrl }}
        style={styles.bannerImage}

      />
      <View style={styles.bannerOverlay}>
        <TouchableOpacity style={styles.toggleBtn} onPress={() => handleToggle(b)}>
          <Text style={b.isActive ? { color: '#059669' } : { color: '#9CA3AF' }}>{b.isActive ? '👁️' : '🚫'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editIconBtn} onPress={() => openEdit(b)}>
          <Text>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDelete(b.id)}>
          <Text>🗑️</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bannerInfo}>
        <Text style={styles.bannerTitle}>{b.title || 'Chưa có tiêu đề'}</Text>
        {b.subtitle && <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>}
        <Text style={styles.bannerPosition}>Vị trí: {b.position} | {b.isActive ? 'Đang hiển thị' : 'Đã ẩn'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý Banner</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={banners}
          renderItem={renderBanner}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchBanners} />}
          ListEmptyComponent={
            <View style={styles.empty}><Text style={styles.emptyIcon}>🖼️</Text><Text style={styles.emptyText}>Chưa có banner nào</Text></View>
          }
        />
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 24 }}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? 'Sửa banner' : 'Thêm banner'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>

              {form.imageUrl ? (
                <Image source={{ uri: form.imageUrl }} style={styles.preview} />
              ) : null}

              <Text style={styles.label}>URL hình ảnh *</Text>
              <TextInput style={styles.input} value={form.imageUrl} onChangeText={(t) => setForm({ ...form, imageUrl: t })} placeholder="https://..." />

              <Text style={styles.label}>Tiêu đề</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} placeholder="Flash Sale Mùa Hè" />

              <Text style={styles.label}>Phụ đề</Text>
              <TextInput style={styles.input} value={form.subtitle} onChangeText={(t) => setForm({ ...form, subtitle: t })} placeholder="Giảm đến 50%" />

              <Text style={styles.label}>Link</Text>
              <TextInput style={styles.input} value={form.linkUrl} onChangeText={(t) => setForm({ ...form, linkUrl: t })} placeholder="/products" />

              <Text style={styles.label}>Vị trí</Text>
              <TextInput style={styles.input} value={form.position} onChangeText={(t) => setForm({ ...form, position: t })} keyboardType="numeric" />

              <Text style={styles.label}>Màu nền</Text>
              <TextInput style={styles.input} value={form.bgColor} onChangeText={(t) => setForm({ ...form, bgColor: t })} placeholder="#f0f9ff" />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Hiển thị</Text>
                <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
                  <Text style={styles.submitBtnText}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm banner'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  addBtn: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 12, paddingBottom: 32 },
  bannerCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  inactive: { opacity: 0.6 },
  bannerImage: { width: '100%', height: 160, backgroundColor: '#F1F5F9' },
  bannerOverlay: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  toggleBtn: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 8 },
  editIconBtn: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 8 },
  deleteIconBtn: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, padding: 8 },
  bannerInfo: { padding: 12 },
  bannerTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  bannerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  bannerPosition: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalScroll: { flex: 1 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalClose: { fontSize: 20, color: '#94A3B8', padding: 4 },
  preview: { width: '100%', height: 140, borderRadius: 12, backgroundColor: '#F1F5F9', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1E293B' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  switchLabel: { fontSize: 14, color: '#475569' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default AdminBannersScreen;
