import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, fetchFlashSales } from '../../store/productSlice';
import ProductCard from '../../components/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../services/api';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items: products, flashSales, loading } = useSelector((state) => state.products);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [personalizedRecs, setPersonalizedRecs] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchProducts({ limit: 8, sort: '-createdAt' }));
    dispatch(fetchFlashSales());
    fetchCategories();
    fetchTrending();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPersonalizedRecs();
    }
  }, [isAuthenticated]);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategoriesList(data.data || []);
    } catch {}
  };

  const fetchTrending = async () => {
    setTrendingLoading(true);
    try {
      const { data } = await api.get('/recommendations/trending');
      const items = data.data?.products || data.data || [];
      setTrendingProducts(Array.isArray(items) ? items.slice(0, 8) : []);
    } catch {} finally { setTrendingLoading(false); }
  };

  const fetchPersonalizedRecs = async () => {
    setRecsLoading(true);
    try {
      const { data } = await api.get('/recommendations/personalized');
      setPersonalizedRecs(data.data?.recommendations || []);
    } catch {} finally { setRecsLoading(false); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchProducts({ limit: 8, sort: '-createdAt' })),
      dispatch(fetchFlashSales()),
      fetchTrending(),
    ]);
    if (isAuthenticated) await fetchPersonalizedRecs();
    setRefreshing(false);
  };

  const activeFlashSale = flashSales?.[0];

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xin chào!</Text>
          <Text style={styles.title}>KhoaLuan</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.searchBtn}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <TouchableOpacity style={styles.banner} onPress={() => navigation.navigate('FlashSale')}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>⚡ Flash Sale</Text>
          <Text style={styles.bannerSubtitle}>Giảm đến 50% - Số lượng có hạn</Text>
        </View>
        <Text style={styles.bannerArrow}>›</Text>
      </TouchableOpacity>

      {/* Categories */}
      {categoriesList.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <FlatList
            data={categoriesList}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryChip}
                onPress={() => navigation.navigate('ProductList', { category: item.id })}
              >
                <Text style={styles.categoryText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Flash Sale Preview */}
      {activeFlashSale && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚡ {activeFlashSale.title}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FlashSale')}>
              <Text style={styles.viewAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={activeFlashSale.products?.slice(0, 5)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.flashCard}
                onPress={() => navigation.navigate('ProductDetail', { slug: item.product?.slug })}
              >
                {item.product?.images?.[0] ? (
                  <Image source={{ uri: item.product.images[0] }} style={styles.flashImage} />
                ) : (
                  <View style={styles.flashImagePlaceholder}><Text>🛍️</Text></View>
                )}
                <Text style={styles.flashPrice}>{item.salePrice?.toLocaleString('vi-VN')}₫</Text>
                <Text style={styles.flashOld}>{(item.product?.discountPrice || item.product?.price)?.toLocaleString('vi-VN')}₫</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Trending Products (ML) */}
      {trendingProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Xu hướng</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
              <Text style={styles.viewAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {trendingLoading ? (
            <LoadingSpinner />
          ) : (
            <FlatList
              data={trendingProducts.slice(0, 5)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.flashCard}
                  onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
                >
                  {item.images?.[0] ? (
                    <Image source={{ uri: item.images[0] }} style={styles.flashImage} />
                  ) : (
                    <View style={styles.flashImagePlaceholder}><Text>🛍️</Text></View>
                  )}
                  <Text style={styles.flashPrice}>{(item.discountPrice || item.price)?.toLocaleString('vi-VN')}₫</Text>
                  <Text style={styles.trendingBadge}>🔥 ML</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Personalized ML Recommendations */}
      {isAuthenticated && personalizedRecs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Gợi ý cho bạn</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
              <Text style={styles.viewAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={personalizedRecs.slice(0, 5)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.flashCard}
                onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
              >
                {item.images?.[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.flashImage} />
                ) : (
                  <View style={styles.flashImagePlaceholder}><Text>🛍️</Text></View>
                )}
                <Text style={styles.flashPrice}>{(item.discountPrice || item.price)?.toLocaleString('vi-VN')}₫</Text>
                <Text style={styles.mlBadge}>🤖 AI</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Products Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sản phẩm mới</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
          <Text style={styles.viewAll}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })} />
        )}
        ListEmptyComponent={loading ? <LoadingSpinner /> : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  greeting: { fontSize: 16, color: '#64748b' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  searchBtn: { width: 44, height: 44, backgroundColor: '#fff', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { fontSize: 18 },
  banner: { backgroundColor: '#3b82f6', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  bannerContent: {},
  bannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  bannerSubtitle: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  bannerArrow: { fontSize: 32, color: '#fff', opacity: 0.7 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  viewAll: { fontSize: 14, color: '#3b82f6', fontWeight: '500' },
  categoryChip: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  categoryText: { fontSize: 14, color: '#475569' },
  flashCard: { width: 140, backgroundColor: '#fff', borderRadius: 12, marginRight: 12, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  flashImage: { width: '100%', height: 100, borderRadius: 8 },
  flashImagePlaceholder: { width: '100%', height: 100, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  flashPrice: { fontSize: 15, fontWeight: 'bold', color: '#ef4444', marginTop: 6 },
  flashOld: { fontSize: 11, color: '#94a3b8', textDecorationLine: 'line-through', marginTop: 2 },
  trendingBadge: { fontSize: 9, color: '#ef4444', fontWeight: 'bold', marginTop: 2, backgroundColor: '#fef2f2', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, alignSelf: 'flex-start', overflow: 'hidden' },
  mlBadge: { fontSize: 9, color: '#7c3aed', fontWeight: 'bold', marginTop: 2, backgroundColor: '#f5f3ff', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, alignSelf: 'flex-start', overflow: 'hidden' },
});

export default HomeScreen;
