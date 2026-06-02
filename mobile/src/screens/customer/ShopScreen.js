import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import ProductCard from '../../components/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from 'react-native-toast-message';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Mới nhất' },
  { value: 'price', label: 'Giá: Thấp đến Cao' },
  { value: '-price', label: 'Giá: Cao đến Thấp' },
  { value: 'sold', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
];

const ShopScreen = ({ route, navigation }) => {
  const { partnerId } = route.params;
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [shopData, setShopData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [following, setFollowing] = useState(false);

  // Products filters
  const [sort, setSort] = useState('-createdAt');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0, ratingDistribution: {} });

  const fetchShop = useCallback(async () => {
    try {
      const { data } = await api.get(`/shops/${partnerId}`);
      setShopData(data.data.partner);
      setProducts(data.data.products || []);
      setFollowing(data.data.partner.isFollowing);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể tải thông tin cửa hàng' });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const { data } = await api.get(`/shops/${partnerId}/reviews`, { params: { limit: 10 } });
      setReviews(data.data.reviews || []);
      setReviewStats(data.data.stats || {});
    } catch {} finally {
      setReviewsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { fetchShop(); }, [fetchShop]);
  useEffect(() => { if (activeTab === 'reviews') fetchReviews(); }, [activeTab, fetchReviews]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShop();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      Toast.show({ type: 'error', text1: 'Vui lòng đăng nhập' });
      return;
    }
    try {
      if (following) {
        await api.delete(`/users/follow/${partnerId}`);
        setFollowing(false);
        setShopData(prev => prev ? { ...prev, followerCount: prev.followerCount - 1 } : prev);
        Toast.show({ type: 'success', text1: 'Đã bỏ theo dõi' });
      } else {
        await api.post('/users/follow', { partnerId });
        setFollowing(true);
        setShopData(prev => prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev);
        Toast.show({ type: 'success', text1: 'Đã theo dõi' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Thao tác thất bại' });
    }
  };

  // Filter products by price range
  const filteredProducts = products.filter(p => {
    const price = p.discountPrice || p.price || 0;
    if (priceMin && price < parseFloat(priceMin)) return false;
    if (priceMax && price > parseFloat(priceMax)) return false;
    return true;
  });

  if (loading) return <LoadingSpinner message="Đang tải..." />;
  if (!shopData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text>Cửa hàng không tồn tại</Text></View>
      </SafeAreaView>
    );
  }

  const renderStars = (rating) => {
    const stars = [];
    const rounded = Math.round(rating || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={[styles.starIcon, i <= rounded && styles.starActive]}>★</Text>
      );
    }
    return stars;
  };

  const renderHeader = () => (
    <View>
      {/* Shop Header */}
      <View style={styles.shopHeader}>
        <View style={styles.shopRow}>
          <View style={styles.shopAvatar}>
            {shopData.avatar ? (
              <Image source={{ uri: shopData.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>🏪</Text>
            )}
          </View>
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shopData.storeName}</Text>
            {shopData.storeDescription && (
              <Text style={styles.shopDesc} numberOfLines={2}>{shopData.storeDescription}</Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{shopData.productCount || 0}</Text><Text style={styles.statLabel}>Sản phẩm</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{shopData.followerCount || 0}</Text><Text style={styles.statLabel}>Theo dõi</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{shopData.totalSold || 0}</Text><Text style={styles.statLabel}>Đã bán</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{shopData.averageRating?.toFixed(1) || '0.0'}</Text><Text style={styles.statLabel}>Đánh giá</Text></View>
        </View>

        <TouchableOpacity
          style={[styles.followBtn, following && styles.followingBtn]}
          onPress={handleFollow}
        >
          <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
            {following ? '✓ Đang theo dõi' : '+ Theo dõi'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['products', 'reviews'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'products' ? '📦 Sản phẩm' : '⭐ Đánh giá'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Products Tab Header */}
      {activeTab === 'products' && (
        <View style={styles.filterBar}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
            <Text style={styles.filterBtnText}>🔍 Lọc</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => {
              const idx = SORT_OPTIONS.findIndex(s => s.value === sort);
              const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
              setSort(next.value);
            }}
          >
            <Text style={styles.sortBtnText}>Sắp xếp ▼</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Panel */}
      {showFilters && activeTab === 'products' && (
        <View style={styles.filterPanel}>
          <View style={styles.priceFilter}>
            <TextInput
              style={styles.priceInput}
              placeholder="Từ ₫"
              placeholderTextColor="#94a3b8"
              value={priceMin}
              onChangeText={setPriceMin}
              keyboardType="numeric"
            />
            <Text style={styles.priceSep}>—</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Đến ₫"
              placeholderTextColor="#94a3b8"
              value={priceMax}
              onChangeText={setPriceMax}
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.sortLabel}>Sắp xếp:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortOptions}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, sort === opt.value && styles.sortChipActive]}
                onPress={() => setSort(opt.value)}
              >
                <Text style={[styles.sortChipText, sort === opt.value && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderProduct = ({ item }) => (
    <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })} />
  );

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>{item.user?.name?.[0] || '?'}</Text>
        </View>
        <View style={styles.reviewUserInfo}>
          <Text style={styles.reviewUserName}>{item.user?.name || 'Ẩn danh'}</Text>
          <View style={styles.reviewStars}>{renderStars(item.rating)}</View>
        </View>
        <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
      </View>
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
      {item.reply && (
        <View style={styles.shopReply}>
          <Text style={styles.shopReplyLabel}>Phản hồi từ shop:</Text>
          <Text style={styles.shopReplyText}>{item.reply}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {activeTab === 'products' ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={renderHeader}
          renderItem={renderProduct}
          ListEmptyComponent={<Text style={styles.empty}>Không có sản phẩm</Text>}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={() => (
            <>
              {renderHeader()}
              {reviewStats.totalReviews > 0 && (
                <View style={styles.reviewSummary}>
                  <Text style={styles.reviewAvg}>{reviewStats.averageRating?.toFixed(1)}</Text>
                  <View style={styles.reviewStarsLarge}>{renderStars(reviewStats.averageRating)}</View>
                  <Text style={styles.reviewTotal}>{reviewStats.totalReviews} đánh giá</Text>
                </View>
              )}
            </>
          )}
          renderItem={renderReview}
          ListEmptyComponent={
            reviewsLoading ? <LoadingSpinner /> : <Text style={styles.empty}>Chưa có đánh giá</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, paddingBottom: 24 },
  row: { gap: 12 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },

  // Shop Header
  shopHeader: { backgroundColor: '#3b82f6', borderRadius: 20, padding: 20, marginBottom: 16 },
  shopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  shopAvatar: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarImg: { width: 60, height: 60, borderRadius: 16 },
  avatarText: { fontSize: 28 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  shopDesc: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#bfdbfe', marginTop: 2 },
  followBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  followingBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  followBtnText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  followingBtnText: { color: '#fff' },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 3, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  // Filters
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  filterBtn: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  filterBtnText: { fontSize: 13, color: '#475569' },
  sortBtn: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sortBtnText: { fontSize: 13, color: '#475569' },
  filterPanel: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  priceFilter: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  priceInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
  priceSep: { marginHorizontal: 8, color: '#94a3b8' },
  sortLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  sortOptions: { flexDirection: 'row' },
  sortChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  sortChipActive: { backgroundColor: '#3b82f6' },
  sortChipText: { fontSize: 12, color: '#475569' },
  sortChipTextActive: { color: '#fff' },

  // Reviews
  reviewSummary: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  reviewAvg: { fontSize: 36, fontWeight: 'bold', color: '#1e293b' },
  reviewStarsLarge: { flexDirection: 'row', marginVertical: 4 },
  reviewTotal: { fontSize: 13, color: '#64748b' },
  starIcon: { fontSize: 14, color: '#d1d5db' },
  starActive: { color: '#f59e0b' },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  reviewAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' },
  reviewUserInfo: { flex: 1 },
  reviewUserName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  reviewStars: { flexDirection: 'row', marginTop: 2 },
  reviewDate: { fontSize: 11, color: '#94a3b8' },
  reviewComment: { fontSize: 14, color: '#475569', lineHeight: 20 },
  shopReply: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12 },
  shopReplyLabel: { fontSize: 11, fontWeight: '600', color: '#059669', marginBottom: 4 },
  shopReplyText: { fontSize: 13, color: '#475569' },
});

export default ShopScreen;
