import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Image,
  RefreshControl, ActivityIndicator, Modal, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminFlashSalesScreen = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', bannerUrl: '',
    startTime: '', endTime: '', isActive: true,
  });

  // Add product form
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [salePrice, setSalePrice] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      const { data } = await api.get('/flash-sales/admin/all');
      setSales(data.data.flashSales);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải flash sale' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  useEffect(() => {
    if (!productSearch.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(productSearch)}&limit=10&inStock=true`);
        setSearchResults(data.data.products || []);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); setExpandedProducts([]); return; }
    setExpandedId(id);
    try {
      const { data } = await api.get(`/flash-sales/${id}`);
      setExpandedProducts(data.data.products || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Không thể tải sản phẩm' });
    }
  };

  const handleSaveSale = async () => {
    if (!form.title || !form.startTime || !form.endTime) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      };
      if (editing) {
        await api.put(`/flash-sales/${editing.id}`, payload);
        Toast.show({ type: 'success', text1: 'Đã cập nhật flash sale' });
      } else {
        await api.post('/flash-sales', payload);
        Toast.show({ type: 'success', text1: 'Đã tạo flash sale' });
      }
      setShowSaleModal(false);
      fetchSales();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally { setSaving(false); }
  };

  const handleAddProduct = async () => {
    if (!selectedProduct || !salePrice) {
      Toast.show({ type: 'error', text1: 'Chọn sản phẩm và nhập giá' });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/flash-sales/${expandedId}/products`, {
        productId: selectedProduct.id,
        salePrice: parseFloat(salePrice),
        maxQuantity: parseInt(maxQty) || 0,
      });
      Toast.show({ type: 'success', text1: 'Đã thêm sản phẩm' });
      setShowProductModal(false);
      setSelectedProduct(null);
      setSalePrice('');
      setMaxQty('');
      toggleExpand(expandedId);
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally { setSaving(false); }
  };

  const handleRemoveProduct = (flashSaleId, productId) => {
    Alert.alert('Xoá sản phẩm', 'Xoá sản phẩm này khỏi flash sale?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/flash-sales/${flashSaleId}/products/${productId}`);
          Toast.show({ type: 'success', text1: 'Đã xoá sản phẩm' });
          toggleExpand(expandedId);
        } catch (err) {
          Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
        }
      }},
    ]);
  };

  const handleDeleteSale = (id) => {
    Alert.alert('Xoá Flash Sale', 'Xoá flash sale này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        try { await api.delete(`/flash-sales/${id}`); Toast.show({ type: 'success', text1: 'Đã xoá' }); fetchSales(); }
        catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
      }},
    ]);
  };

  const renderSale = ({ item: s }) => {
    const now = new Date();
    const isActive = s.isActive && new Date(s.startTime) <= now && new Date(s.endTime) >= now;
    const isUpcoming = s.isActive && new Date(s.startTime) > now;
    const isExpired = new Date(s.endTime) < now;
    const statusText = !s.isActive ? 'Tạm dừng' : isExpired ? 'Đã kết thúc' : isUpcoming ? 'Sắp diễn ra' : 'Đang diễn ra';
    const isExpanded = expandedId === s.id;

    return (
      <View style={styles.saleCard}>
        <View style={styles.saleHeader}>
          <View style={styles.saleIcon}><Text style={styles.saleIconText}>⚡</Text></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.saleTitle}>{s.title}</Text>
            {s.description && <Text style={styles.saleDesc}>{s.description}</Text>}
            <View style={styles.saleMeta}>
              <View style={[styles.statusBadge, { backgroundColor: statusText === 'Đang diễn ra' ? '#D1FAE5' : statusText === 'Sắp diễn ra' ? '#DBEAFE' : '#FEE2E2' }]}>
                <Text style={[styles.statusText, { color: statusText === 'Đang diễn ra' ? '#059669' : statusText === 'Sắp diễn ra' ? '#2563EB' : '#EF4444' }]}>{statusText}</Text>
              </View>
              <Text style={styles.metaText}>{new Date(s.startTime).toLocaleDateString('vi-VN')} → {new Date(s.endTime).toLocaleDateString('vi-VN')}</Text>
              <Text style={styles.metaText}>{s._count?.products || 0} SP</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.expandBtn} onPress={() => toggleExpand(s.id)}>
            <Text>{isExpanded ? '▲' : '📦'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteSaleBtn} onPress={() => handleDeleteSale(s.id)}>
            <Text>🗑️</Text>
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.expandedHeader}>
              <Text style={styles.expandedTitle}>Sản phẩm ({expandedProducts.length})</Text>
              <TouchableOpacity style={styles.addProductBtn} onPress={() => {
                setSelectedProduct(null); setSalePrice(''); setMaxQty(''); setProductSearch('');
                setShowProductModal(true);
              }}>
                <Text style={styles.addProductBtnText}>+ Thêm SP</Text>
              </TouchableOpacity>
            </View>
            {expandedProducts.length === 0 ? (
              <Text style={styles.noProductText}>Chưa có sản phẩm</Text>
            ) : (
              expandedProducts.map((item) => {
                const product = item.product || {};
                const origPrice = product.discountPrice || product.price || 0;
                const discount = origPrice > 0 ? Math.round((1 - (item.salePrice || 0) / origPrice) * 100) : 0;
                return (
                  <View key={item.id} style={styles.productRow}>
                    <Image source={{ uri: product.images?.[0] }} style={styles.productThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name || 'Đã xoá'}</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.flashPrice}>{(item.salePrice || 0).toLocaleString('vi-VN')}₫</Text>
                        <Text style={styles.origPrice}>{origPrice.toLocaleString('vi-VN')}₫</Text>
                        {discount > 0 && <Text style={styles.discountBadge}>-{discount}%</Text>}
                      </View>
                      <Text style={styles.soldText}>Đã bán: {item.soldCount || 0}{item.maxQuantity > 0 ? ` / ${item.maxQuantity}` : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveProduct(s.id, product.id)} style={styles.removeBtn}>
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý Flash Sale</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          setEditing(null);
          setForm({ title: '', description: '', bannerUrl: '', startTime: '', endTime: '', isActive: true });
          setShowSaleModal(true);
        }}>
          <Text style={styles.addBtnText}>+ Tạo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sales}
          renderItem={renderSale}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchSales} />}
          ListEmptyComponent={
            <View style={styles.empty}><Text style={styles.emptyIcon}>⚡</Text><Text style={styles.emptyText}>Chưa có flash sale nào</Text></View>
          }
        />
      )}

      {/* Sale Modal */}
      <Modal visible={showSaleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 24 }}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Sửa Flash Sale' : 'Tạo Flash Sale'}</Text>
              <TouchableOpacity onPress={() => setShowSaleModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.label}>Tiêu đề *</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} />
            <Text style={styles.label}>Mô tả</Text>
            <TextInput style={[styles.input, { height: 60 }]} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline />
            <Text style={styles.label}>URL Banner</Text>
            <TextInput style={styles.input} value={form.bannerUrl} onChangeText={(t) => setForm({ ...form, bannerUrl: t })} />
            <Text style={styles.label}>Bắt đầu *</Text>
            <TextInput style={styles.input} value={form.startTime} onChangeText={(t) => setForm({ ...form, startTime: t })} placeholder="2024-06-01T10:00" />
            <Text style={styles.label}>Kết thúc *</Text>
            <TextInput style={styles.input} value={form.endTime} onChangeText={(t) => setForm({ ...form, endTime: t })} placeholder="2024-06-01T22:00" />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Kích hoạt</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSaleModal(false)}><Text style={styles.cancelBtnText}>Huỷ</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveSale} disabled={saving}><Text style={styles.submitBtnText}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo Flash Sale'}</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView></View>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={showProductModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 24 }}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm sản phẩm</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.label}>Tìm sản phẩm</Text>
            <TextInput style={styles.input} value={productSearch} onChangeText={setProductSearch} placeholder="Gõ tên sản phẩm..." />
            {searching && <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 8 }}>Đang tìm...</Text>}
            {searchResults.map((p) => (
              <TouchableOpacity key={p.id} style={[styles.searchItem, selectedProduct?.id === p.id && styles.searchItemSelected]} onPress={() => { setSelectedProduct(p); if (!salePrice) setSalePrice(String(p.price)); }}>
                <Image source={{ uri: p.images?.[0] }} style={styles.searchThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchName}>{p.name}</Text>
                  <Text style={styles.searchPrice}>{p.price.toLocaleString('vi-VN')}₫{p.discountPrice ? ` → ${p.discountPrice.toLocaleString('vi-VN')}₫` : ''}</Text>
                </View>
                {selectedProduct?.id === p.id && <Text style={{ color: '#3B82F6' }}>✓</Text>}
              </TouchableOpacity>
            ))}
            {selectedProduct && (
              <>
                <Text style={styles.label}>Giá Flash Sale *</Text>
                <TextInput style={styles.input} value={salePrice} onChangeText={setSalePrice} keyboardType="numeric" placeholder="149000" />
                <Text style={styles.label}>SL tối đa (0 = không giới hạn)</Text>
                <TextInput style={styles.input} value={maxQty} onChangeText={setMaxQty} keyboardType="numeric" placeholder="100" />
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProductModal(false)}><Text style={styles.cancelBtnText}>Huỷ</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddProduct} disabled={saving || !selectedProduct}><Text style={styles.submitBtnText}>{saving ? 'Đang thêm...' : 'Thêm vào Flash Sale'}</Text></TouchableOpacity>
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
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 12, paddingBottom: 32 },
  saleCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  saleHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  saleIcon: { width: 44, height: 44, backgroundColor: '#FEF3C7', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saleIconText: { fontSize: 22 },
  saleTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  saleDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  saleMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  metaText: { fontSize: 10, color: '#94A3B8' },
  expandBtn: { padding: 8, marginLeft: 8 },
  deleteSaleBtn: { padding: 8 },
  expandedSection: { borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 16 },
  expandedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  expandedTitle: { fontSize: 13, fontWeight: '600', color: '#475569' },
  addProductBtn: { backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  addProductBtnText: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  noProductText: { textAlign: 'center', color: '#94A3B8', paddingVertical: 24 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 6, gap: 10 },
  productThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#E2E8F0' },
  productName: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  flashPrice: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  origPrice: { fontSize: 11, color: '#94A3B8', textDecorationLine: 'line-through' },
  discountBadge: { fontSize: 10, backgroundColor: '#FEE2E2', color: '#EF4444', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, fontWeight: '600' },
  soldText: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  removeBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalScroll: { flex: 1 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalClose: { fontSize: 20, color: '#94A3B8', padding: 4 },
  label: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1E293B' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  switchLabel: { fontSize: 14, color: '#475569' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  searchItem: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#F8FAFC', borderRadius: 10, marginBottom: 4, gap: 10 },
  searchItemSelected: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  searchThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#E2E8F0' },
  searchName: { fontSize: 13, color: '#1E293B' },
  searchPrice: { fontSize: 11, color: '#94A3B8' },
});

export default AdminFlashSalesScreen;
