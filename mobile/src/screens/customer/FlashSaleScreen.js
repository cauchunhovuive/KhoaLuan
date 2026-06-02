import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFlashSales } from '../../store/productSlice';
import LoadingSpinner from '../../components/LoadingSpinner';

const FlashSaleScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { flashSales, loading } = useSelector((state) => state.products);
  const active = flashSales?.[0];

  useEffect(() => {
    dispatch(fetchFlashSales());
  }, []);

  if (loading && !active) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>⚡ Flash Sale</Text>
        <Text style={styles.heroSub}>{active?.title || 'Siêu sale giới hạn'}</Text>
      </View>

      <FlatList
        data={active?.products || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const product = item.product || {};
          const originalPrice = product.discountPrice || product.price || 0;
          const discountPct = originalPrice > 0 ? Math.round((1 - item.salePrice / originalPrice) * 100) : 0;

          return (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => navigation.navigate('ProductDetail', { slug: product.slug })}
            >
              {product.images?.[0] ? (
                <Image source={{ uri: product.images[0] }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}><Text>🛍️</Text></View>
              )}
              {discountPct > 0 && (
                <View style={styles.discountBadge}><Text style={styles.discountText}>-{discountPct}%</Text></View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.flashPrice}>{item.salePrice?.toLocaleString('vi-VN')}₫</Text>
                <Text style={styles.oldPrice}>{originalPrice?.toLocaleString('vi-VN')}₫</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${item.maxQuantity > 0 ? Math.min(100, (item.soldCount / item.maxQuantity) * 100) : 0}%` }]} />
                </View>
                {item.maxQuantity > 0 && (
                  <Text style={styles.soldText}>Đã bán {item.soldCount}/{item.maxQuantity}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có sản phẩm flash sale</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  hero: { backgroundColor: '#ef4444', padding: 24, alignItems: 'center' },
  heroTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  heroSub: { fontSize: 15, color: '#fecaca', marginTop: 4 },
  list: { padding: 12 },
  row: { gap: 12 },
  productCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  productImage: { width: '100%', aspectRatio: 1 },
  imagePlaceholder: { width: '100%', aspectRatio: 1, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#ef4444', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '500', color: '#1e293b', marginBottom: 4 },
  flashPrice: { fontSize: 16, fontWeight: 'bold', color: '#ef4444' },
  oldPrice: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
  progressBar: { height: 4, backgroundColor: '#fee2e2', borderRadius: 2, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#ef4444', borderRadius: 2 },
  soldText: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
});

export default FlashSaleScreen;
