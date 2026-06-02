import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminCategoriesScreen = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải danh mục' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập tên danh mục' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
        Toast.show({ type: 'success', text1: 'Cập nhật danh mục thành công' });
      } else {
        await api.post('/categories', form);
        Toast.show({ type: 'success', text1: 'Thêm danh mục thành công' });
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('Xoá danh mục', `Xoá danh mục "${name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/categories/${id}`);
            Toast.show({ type: 'success', text1: 'Đã xoá danh mục' });
            fetchCategories();
          } catch (err) {
            Toast.show({ type: 'error', text1: err.response?.data?.message || 'Xoá thất bại' });
          }
        },
      },
    ]);
  };

  const renderCategory = ({ item }) => (
    <View style={styles.catCard}>
      <View style={styles.catInfo}>
        <Text style={styles.catName}>{item.name}</Text>
        {item.description && <Text style={styles.catDesc} numberOfLines={2}>{item.description}</Text>}
        <Text style={styles.catCount}>{item._count?.products || 0} sản phẩm</Text>
      </View>
      <View style={styles.catActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.name)}>
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý danh mục</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchCategories} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyText}>Chưa có danh mục nào</Text>
            </View>
          }
        />
      )}

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tên danh mục</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Nhập tên danh mục"
            />

            <Text style={styles.inputLabel}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
              placeholder="Mô tả (không bắt buộc)"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
                <Text style={styles.submitBtnText}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm mới'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  catCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row' },
  catInfo: { flex: 1 },
  catName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  catDesc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  catCount: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
  catActions: { justifyContent: 'center', gap: 8, marginLeft: 12 },
  editBtn: { padding: 8 },
  editBtnText: { fontSize: 18 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 18 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalClose: { fontSize: 20, color: '#94A3B8', padding: 4 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1E293B' },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default AdminCategoriesScreen;
