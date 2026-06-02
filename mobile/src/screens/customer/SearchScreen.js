import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../../store/productSlice';
import ProductCard from '../../components/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../services/api';

const SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá: Thấp → Cao' },
  { value: 'price_desc', label: 'Giá: Cao → Thấp' },
  { value: 'newest', label: 'Mới nhất' },
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

const TRENDING_TAGS = ['Điện thoại', 'Laptop', 'Tai nghe', 'Bàn phím', 'Chuột', 'Màn hình', 'Ốp lưng', 'Cáp sạc'];

const SearchScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.products);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { categories } = useSelector((state) => state.products);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchProducts({ limit: 0 }));
    }
  }, []);

  const handleSearch = (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    const params = { search: q.trim(), limit: 20 };
    if (sort) params.sort = sort;
    if (priceRange) params.price = priceRange;
    if (categoryFilter) params.category = categoryFilter;
    dispatch(fetchProducts(params));
    setShowSuggestions(false);
  };

  // Autocomplete suggestions
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    setSuggestionsLoading(true);
    try {
      const { data } = await api.get('/products', { params: { search: q, limit: 5 } });
      const results = data.data?.products || [];
      setSuggestions(results.slice(0, 5));
      setShowSuggestions(results.length > 0);
    } catch { setSuggestions([]); }
    finally { setSuggestionsLoading(false); }
  }, []);

  const handleInputChange = (val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionPress = (suggestion) => {
    setQuery(suggestion.name);
    dispatch(fetchProducts({ search: suggestion.name, limit: 20 }));
    setShowSuggestions(false);
  };

  const hasActiveFilters = sort || priceRange || categoryFilter;

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Tìm sản phẩm..."
          value={query}
          onChangeText={handleInputChange}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
          autoFocus
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity onPress={() => handleSearch()} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={[styles.filterBtnText, hasActiveFilters && styles.filterBtnTextActive]}>🔧</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>💡 Gợi ý</Text>
          {suggestions.map((s, idx) => (
            <TouchableOpacity key={s.id || idx} style={styles.suggestionItem} onPress={() => handleSuggestionPress(s)}>
              {s.images?.[0] && (
                <Image source={{ uri: s.images[0] }} style={styles.suggestionImage} />
              )}
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.suggestionPrice}>{(s.discountPrice || s.price)?.toLocaleString('vi-VN')}₫</Text>
              </View>
              <Text style={styles.suggestionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Sắp xếp:</Text>
          <View style={styles.filterRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterChip, sort === opt.value && styles.filterChipActive]}
                onPress={() => setSort(sort === opt.value ? '' : opt.value)}
              >
                <Text style={[styles.filterChipText, sort === opt.value && styles.filterChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>Khoảng giá:</Text>
          <View style={styles.filterRow}>
            {PRICE_RANGES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.filterChip, priceRange === r.value && styles.filterChipActive]}
                onPress={() => setPriceRange(priceRange === r.value ? '' : r.value)}
              >
                <Text style={[styles.filterChipText, priceRange === r.value && styles.filterChipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearFilters} onPress={() => { setSort(''); setPriceRange(''); setCategoryFilter(''); }}>
              <Text style={styles.clearFiltersText}>✕ Xoá bộ lọc</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })} />
        )}
        ListEmptyComponent={
          loading ? <LoadingSpinner /> : !query ? (
            <View>
              <Text style={styles.empty}>Nhập từ khoá để tìm kiếm</Text>
              <Text style={styles.trendingTitle}>🔥 Tìm kiếm phổ biến</Text>
              <View style={styles.trendingRow}>
                {TRENDING_TAGS.map(tag => (
                  <TouchableOpacity key={tag} style={styles.trendingChip} onPress={() => { setQuery(tag); handleSearch(tag); }}>
                    <Text style={styles.trendingText}>🔍 {tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>Không tìm thấy kết quả cho "{query}"</Text>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', padding: 12, gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
  searchBtn: { width: 48, height: 48, backgroundColor: '#3b82f6', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { fontSize: 20 },
  filterBtn: { width: 48, height: 48, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  filterBtnActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
  filterBtnText: { fontSize: 18 },
  filterBtnTextActive: {},

  // Suggestions
  suggestionsContainer: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', zIndex: 100, elevation: 5 },
  suggestionsTitle: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionImage: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 10 },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  suggestionPrice: { fontSize: 12, color: '#64748b', marginTop: 2 },
  suggestionArrow: { fontSize: 18, color: '#d1d5db' },

  // Filters
  filterPanel: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 8, marginBottom: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterChipText: { fontSize: 12, color: '#475569' },
  filterChipTextActive: { color: '#fff' },
  clearFilters: { marginTop: 10, alignItems: 'center', paddingVertical: 6 },
  clearFiltersText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },

  list: { padding: 12 },
  row: { gap: 12 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
  trendingTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 20, marginBottom: 12, textAlign: 'center' },
  trendingRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  trendingChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  trendingText: { fontSize: 13, color: '#475569' },
});

export default SearchScreen;
