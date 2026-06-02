import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, TextInput,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const PartnerProductsScreen = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '', discountPrice: '', stock: '', categoryId: '', images: [''],
  });

  const fetchProducts = useCallback(async () => {
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/partner/products', { params });
      setProducts(data.data.products);
      setTotalPages(data.data.pagination.totalPages);
    } catch { Toast.show({ type: 'error', text1: 'Không thể tải sản phẩm' }); }
    finally { setLoading(false); }
  }, [page, search]);

  const fetchCategories = async () => {
    try { const { data } = await api.get('/categories'); setCategories(data.data); } catch {}
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, [fetchProducts]);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', discountPrice: '', stock: '', categoryId: '', images: [''] });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '', price: String(p.price),
      discountPrice: p.discountPrice ? String(p.discountPrice) : '', stock: String(p.stock),
      categoryId: p.categoryId || '', images: p.images?.length ? p.images : [''],
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.stock || !form.categoryId) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
        stock: parseInt(form.stock),
        images: form.images[0] ? form.images : ['https://via.placeholder.com/400'],
      };
      if (editing) {
        await api.put(`/partner/products/${editing.id}`, payload);
        Toast.show({ type: 'success', text1: 'Cập nhật thành công' });
      } else {
        await api.post('/partner/products', payload);
        Toast.show({ type: 'success', text1: 'Đã thêm sản phẩm' });
      }
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally { setSaving(false); }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await api.put(`/partner/products/${id}`, { isActive: !isActive });
      Toast.show({ type: 'success', text1: isActive ? 'Đã ẩn' : 'Đã đăng bán' });
      fetchProducts();
    } catch { Toast.show({ type: 'error', text1: 'Lỗi' }); }
  };

  const handleDelete = (id) => {
    Alert.alert('Xoá sản phẩm', 'Bạn có chắc muốn xoá?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        try { await api.delete(`/partner/products/${id}`); Toast.show({ type: 'success', text1: 'Đã xoá' }); fetchProducts(); }
        catch { Toast.show({ type: 'error', text1: 'Lỗi' }); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📦 Sản phẩm của tôi</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Tìm sản phẩm..." onSubmitEditing={() => setPage(1)} placeholderTextColor="#94A3B8" />
      </View>

      {loading ? <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Image source={{ uri: item.images?.[0] }} style={styles.productImage} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}₫{item.discountPrice ? ` → ${item.discountPrice.toLocaleString('vi-VN')}₫` : ''}</Text>
                <Text style={styles.productStock}>Kho: {item.stock} | {item.category?.name || '—'}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: item.isActive !== false ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.badgeText, { color: item.isActive !== false ? '#059669' : '#EF4444' }]}>
                      {item.isActive !== false ? 'Đang bán' : 'Ẩn'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggle(item.id, item.isActive)}>
                  <Text>{item.isActive !== false ? '⏸️' : '▶️'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                  <Text>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Chưa có sản phẩm nào</Text>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}><Text>◀</Text></TouchableOpacity>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <TouchableOpacity key={p} onPress={() => setPage(p)} style={[styles.pageNumBtn, p === page && styles.pageNumActive]}>
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
              <Text style={styles.modalTitle}>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.label}>Tên sản phẩm *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="VD: Áo sơ mi nam" />
            <Text style={styles.label}>Mô tả</Text>
            <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline />
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Giá *</Text>
                <TextInput style={styles.input} value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Giá giảm</Text>
                <TextInput style={styles.input} value={form.discountPrice} onChangeText={(t) => setForm({ ...form, discountPrice: t })} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Số lượng *</Text>
                <TextInput style={styles.input} value={form.stock} onChangeText={(t) => setForm({ ...form, stock: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Danh mục *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }}>
                  {categories.map(cat => (
                    <TouchableOpacity key={cat.id} style={[styles.catChip, form.categoryId === cat.id && styles.catChipActive]}
                      onPress={() => setForm({ ...form, categoryId: cat.id })}>
                      <Text style={[styles.catChipText, form.categoryId === cat.id && styles.catChipTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <Text style={styles.label}>Link ảnh</Text>
            <TextInput style={styles.input} value={form.images[0]} onChangeText={(t) => setForm({ ...form, images: [t] })} placeholder="https://..." />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Huỷ</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}><Text style={styles.submitBtnText}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Đăng sản phẩm'}</Text></TouchableOpacity>
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
  searchBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, fontSize: 13, color: '#1E293B' },
  list: { padding: 12, paddingBottom: 40 },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  productImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F1F5F9' },
  productName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#059669', marginTop: 2 },
  productStock: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  actions: { justifyContent: 'center', gap: 4, marginLeft: 8 },
  actionBtn: { padding: 6 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, flexWrap: 'wrap' },
  pageBtn: { padding: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  pageNumBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
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
  formRow: { flexDirection: 'row', gap: 10 },
  catChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9', marginRight: 6, marginTop: 4 },
  catChipActive: { backgroundColor: '#059669' },
  catChipText: { fontSize: 11, color: '#64748B' },
  catChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#059669', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default PartnerProductsScreen;
