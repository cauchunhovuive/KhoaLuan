import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductDetail, clearProduct } from '../../store/productSlice';
import { addToCart } from '../../store/cartSlice';
import LoadingSpinner from '../../components/LoadingSpinner';

const ProductDetailScreen = ({ route, navigation }) => {
  const { slug } = route.params;
  const dispatch = useDispatch();
  const { product, loading } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchProductDetail(slug));
    return () => dispatch(clearProduct());
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;
    dispatch(addToCart({ productId: product.id, quantity: 1 }))
      .unwrap()
      .then(() => Alert.alert('Thành công', 'Đã thêm vào giỏ hàng'))
      .catch((err) => Alert.alert('Lỗi', err || 'Không thể thêm vào giỏ'));
  };

  if (loading || !product) return <LoadingSpinner message="Đang tải..." />;

  const price = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Image */}
        <View style={styles.imageContainer}>
          {product.images?.[0] ? (
            <Image source={{ uri: product.images[0] }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}><Text style={{ fontSize: 48 }}>🛍️</Text></View>
          )}
          {discountPct > 0 && (
            <View style={styles.discountBadge}><Text style={styles.discountText}>-{discountPct}%</Text></View>
          )}
        </View>

        {/* Info */}
        <View style={styles.content}>
          <Text style={styles.category}>{product.category?.name || 'Sản phẩm'}</Text>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{price?.toLocaleString('vi-VN')}₫</Text>
            {hasDiscount && <Text style={styles.oldPrice}>{product.price?.toLocaleString('vi-VN')}₫</Text>}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.rating}>⭐ {product.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.sold}>Đã bán {product.soldCount || 0}</Text>
            <Text style={styles.stock}>Còn {product.stock || 0}</Text>
          </View>

          {product.partner?.storeName && (
            <TouchableOpacity style={styles.storeRow} onPress={() => navigation.navigate('Shop', { partnerId: product.partner.id })}>
              <Text style={styles.storeIcon}>🏪</Text>
              <Text style={styles.storeName}>{product.partner.storeName}</Text>
              <Text style={styles.storeArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* Description */}
          {product.description && (
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>Mô tả sản phẩm</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </View>
          )}

          {/* Reviews */}
          {product.reviews?.length > 0 && (
            <View style={styles.reviewSection}>
              <Text style={styles.descTitle}>Đánh giá ({product.reviews.length})</Text>
              {product.reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <Text style={styles.reviewUser}>{review.user?.name || 'Ẩn danh'}</Text>
                  <Text style={styles.reviewStars}>{'⭐'.repeat(review.rating)}</Text>
                  {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.bottomPrice}>{price?.toLocaleString('vi-VN')}₫</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart}>
          <Text style={styles.addBtnText}>Thêm vào giỏ hàng</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imageContainer: { backgroundColor: '#f8fafc', position: 'relative' },
  image: { width: '100%', aspectRatio: 1 },
  imagePlaceholder: { width: '100%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  discountBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  discountText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  content: { padding: 16 },
  category: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, lineHeight: 28 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#3b82f6' },
  oldPrice: { fontSize: 16, color: '#94a3b8', textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  rating: { fontSize: 14, color: '#64748b' },
  sold: { fontSize: 14, color: '#64748b' },
  stock: { fontSize: 14, color: '#64748b' },
  storeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 20 },
  storeIcon: { fontSize: 18, marginRight: 8 },
  storeName: { fontSize: 15, fontWeight: '500', color: '#1e293b', flex: 1 },
  storeArrow: { fontSize: 22, color: '#94a3b8' },
  descSection: { marginBottom: 20 },
  descTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  descText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  reviewSection: { marginBottom: 20 },
  reviewItem: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8 },
  reviewUser: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  reviewStars: { fontSize: 14, marginVertical: 2 },
  reviewComment: { fontSize: 13, color: '#475569', marginTop: 2 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 12 },
  bottomPrice: { fontSize: 22, fontWeight: 'bold', color: '#3b82f6', flex: 1 },
  addBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

export default ProductDetailScreen;
