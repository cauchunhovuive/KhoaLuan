import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../../store/productSlice';
import api from '../../services/api';
import ProductCard from '../../components/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Mới nhất' },
  { value: 'price', label: 'Giá: Thấp đến Cao' },
  { value: '-price', label: 'Giá: Cao đến Thấp' },
  { value: 'sold', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
];

const PRICE_RANGES = [
  { value: '', label: 'Tất cả' },
  { value: '0-100000', label: 'Dưới 100K' },
  { value: '100000-300000', label: '100K - 300K' },
  { value: '300000-500000', label: '300K - 500K' },
  { value: '500000-1000000', label: '500K - 1Tr' },
  { value: '1000000-99999999', label: 'Trên 1Tr' },
];

const ProductListScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items: products, loading } = useSelector((state) => state.products);
  const [categoriesList, setCategoriesList] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSort, setActiveSort] = useState('-createdAt');
  const [priceRange, setPriceRange] = useState('');

  useEffect(() => {
    fetchCategoryList();
  }, []);

  const fetchCategoryList = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategoriesList(data.data || []);
    } catch {}
  };

  useEffect(() => {
    const params = { limit: 20, sort: activeSort };
    if (activeCategory) params.category = activeCategory;
    if (priceRange) params.price = priceRange;
    if (search.trim()) params.search = search.trim();
    dispatch(fetchProducts(params));
  }, [dispatch, activeCategory, activeSort, priceRange]);

  const onRefresh = async () => {
    setRefreshing(true);
    const params = { limit: 20, sort: activeSort, search: search || undefined };
    if (activeCategory) params.category = activeCategory;
    if (priceRange) params.price = priceRange;
    await dispatch(fetchProducts(params));
    setRefreshing(false);
  };

  const handleSearch = () => {
    const params = { limit: 20, sort: activeSort, search: search || undefined };
    if (activeCategory) params.category = activeCategory;
    if (priceRange) params.price = priceRange;
    dispatch(fetchProducts(params));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sản phẩm</Text>
          <Text style={styles.count}>{products.length} sản phẩm</Text>
        </View>
        <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterToggleText}>🔍 Lọc {showFilters ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm sản phẩm..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, activeSort === opt.value && styles.sortChipActive]}
                onPress={() => setActiveSort(opt.value)}
              >
                <Text style={[styles.sortChipText, activeSort === opt.value && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Danh mục:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.categoryChip, !activeCategory && styles.categoryChipActive]}
              onPress={() => setActiveCategory('')}
            >
              <Text style={[styles.categoryChipText, !activeCategory && styles.categoryChipTextActive]}>Tất cả</Text>
            </TouchableOpacity>
            {categoriesList.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip,                activeCategory === cat.id && styles.categoryChipActive]}
                onPress={() => setActiveCategory(activeCategory === cat.id ? '' : cat.id)}
              >
                <Text style={[styles.categoryChipText, activeCategory === cat.id && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Khoảng giá:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PRICE_RANGES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.categoryChip, priceRange === r.value && styles.categoryChipActive]}
                onPress={() => setPriceRange(priceRange === r.value ? '' : r.value)}
              >
                <Text style={[styles.categoryChipText, priceRange === r.value && styles.categoryChipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })} />
        )}
        ListEmptyComponent={loading ? <LoadingSpinner /> : <Text style={styles.empty}>Không tìm thấy sản phẩm</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  count: { fontSize: 13, color: '#64748b', marginTop: 2 },
  filterToggle: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  filterToggleText: { fontSize: 13, color: '#475569' },
  searchBar: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
  list: { padding: 16, paddingTop: 4 },
  row: { gap: 12 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },

  // Filters
  filterPanel: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 10, marginBottom: 6 },
  sortRow: { marginBottom: 4 },
  sortChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  sortChipActive: { backgroundColor: '#3b82f6' },
  sortChipText: { fontSize: 12, color: '#475569' },
  sortChipTextActive: { color: '#fff' },
  categoryChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  categoryChipActive: { backgroundColor: '#3b82f6' },
  categoryChipText: { fontSize: 12, color: '#475569' },
  categoryChipTextActive: { color: '#fff' },
});

export default ProductListScreen;
