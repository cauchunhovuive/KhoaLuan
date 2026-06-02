import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Image,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminProductsScreen = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', stock: '', isActive: true });
  const searchTimerRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    try {
      const params = { limit: 10, page };
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter) params.category = categoryFilter;
      const { data } = await api.get('/products', { params });
      setProducts(data.data.products);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải sản phẩm' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, searchQuery, categoryFilter]);

  const handleSearchChange = (text) => {
    setSearchInput(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(text);
      setPage(1);
    }, 300);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch {}
  }, []);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  const handleEdit = (product) => {
    setEditing(product);
    setForm({ name: product.name, price: String(product.price), stock: String(product.stock), isActive: product.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/products/${editing.id}`, {
        name: form.name, price: parseFloat(form.price), stock: parseInt(form.stock), isActive: form.isActive,
      });
      Toast.show({ type: 'success', text1: 'Cập nhật thành công' });
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (product) => {
    try {
      await api.put(`/products/${product.id}`, { isActive: !product.isActive });
      Toast.show({ type: 'success', text1: product.isActive ? 'Đã ẩn' : 'Đã hiện' });
      fetchProducts();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Xoá sản phẩm', 'Xoá sản phẩm này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        try { await api.delete(`/products/${id}`); Toast.show({ type: 'success', text1: 'Đã xoá' }); fetchProducts(); }
        catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
      }},
    ]);
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productRow}>
        <Image source={{ uri: item.images?.[0] }} style={styles.productImage} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productShop}>{item.partner?.storeName || item.partner?.name || '—'}</Text>
          <View style={styles.productMeta}>
            <Text style={styles.productCat}>{item.category?.name || '—'}</Text>
            <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}₫</Text>
          </View>
          <View style={styles.productMeta}>
            <Text style={{ fontSize: 11, color: item.stock <= 5 ? '#EF4444' : '#64748B' }}>
              Kho: {item.stock} | Đã bán: {item.soldCount || 0}
            </Text>
            <View style={[styles.ratingBadge]}>
              <Text style={{ fontSize: 11, color: '#F59E0B' }}>★ {item.rating?.toFixed(1) || '0.0'}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.toggleBtn]} onPress={() => handleToggleActive(item)}>
          <Text style={styles.actionBtnText}>{item.isActive ? '👁️' : '🚫'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.editActionBtn]} onPress={() => handleEdit(item)}>
          <Text style={styles.actionBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteActionBtn]} onPress={() => handleDelete(item.id)}>
          <Text style={styles.actionBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý sản phẩm</Text>
      </View>

      {/* Search + Category filter */}
      <View style={styles.filterSection}>          <TextInput style={styles.searchInput} value={searchInput} onChangeText={handleSearchChange} placeholder="Tìm sản phẩm..." onSubmitEditing={() => { setSearchQuery(searchInput); setPage(1); }} />
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={['', ...categories]}
          keyExtractor={(item) => item?.id || ''}
          contentContainerStyle={{ gap: 6 }}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[styles.catChip,            categoryFilter === (cat?.id || '') && styles.catChipActive]}
              onPress={() => { setCategoryFilter(cat?.id || ''); setPage(1); }}
            >
              <Text style={[styles.catChipText, categoryFilter === (cat?.id || '') && styles.catChipTextActive]}>
                {cat?.name || 'Tất cả'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts(); }} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>📦</Text><Text style={styles.emptyText}>Không có sản phẩm</Text></View>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}><Text>◀</Text></TouchableOpacity>
                <Text style={{ fontSize: 14, color: '#475569' }}>{page}/{totalPages}</Text>
                <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={[styles.pageBtn, page === totalPages && { opacity: 0.4 }]}><Text>▶</Text></TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sửa sản phẩm</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.label}>Tên sản phẩm</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
            <Text style={styles.label}>Giá</Text>
            <TextInput style={styles.input} value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} keyboardType="numeric" />
            <Text style={styles.label}>Tồn kho</Text>
            <TextInput style={styles.input} value={form.stock} onChangeText={(t) => setForm({ ...form, stock: t })} keyboardType="numeric" />
            <View style={styles.switchRow}>
              <Text style={{ fontSize: 14, color: '#475569' }}>Đang bán</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelBtnText}>Huỷ</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}><Text style={styles.submitBtnText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  filterSection: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 10 },
  searchInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, fontSize: 13, color: '#1E293B' },
  catChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  catChipActive: { backgroundColor: '#3B82F6' },
  catChipText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  catChipTextActive: { color: '#fff' },
  list: { padding: 12, paddingBottom: 32 },
  productCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  productRow: { flexDirection: 'row' },
  productImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F1F5F9' },
  productName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  productShop: { fontSize: 11, color: '#059669', marginTop: 2 },
  productMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  productCat: { fontSize: 11, color: '#64748B', backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  productPrice: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  ratingBadge: {},
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', justifyContent: 'flex-end' },
  actionBtn: { padding: 8, borderRadius: 8 },
  toggleBtn: { backgroundColor: '#F0FDF4' },
  editActionBtn: { backgroundColor: '#EFF6FF' },
  deleteActionBtn: { backgroundColor: '#FEE2E2' },
  actionBtnText: { fontSize: 16 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalClose: { fontSize: 20, color: '#94A3B8', padding: 4 },
  label: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1E293B' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default AdminProductsScreen;
