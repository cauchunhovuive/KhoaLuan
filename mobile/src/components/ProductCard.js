import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const ProductCard = ({ product, onPress, horizontal = false }) => {
  const price = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;

  return (
    <TouchableOpacity
      style={[styles.card, horizontal && styles.horizontal]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.imageContainer}>
        {product.images?.[0] ? (
          <Image source={{ uri: product.images[0] }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>🛍️</Text>
          </View>
        )}
        {discountPct > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPct}%</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        {product.category?.name && (
          <Text style={styles.category}>{product.category.name}</Text>
        )}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{price?.toLocaleString('vi-VN')}₫</Text>
          {hasDiscount && (
            <Text style={styles.oldPrice}>{product.price?.toLocaleString('vi-VN')}₫</Text>
          )}
        </View>
        <View style={styles.meta}>
          <Text style={styles.rating}>⭐ {product.rating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.sold}>Đã bán {product.soldCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  horizontal: { flexDirection: 'row' },
  imageContainer: { position: 'relative', backgroundColor: '#f8fafc' },
  image: { width: '100%', aspectRatio: 1 },
  imagePlaceholder: { width: '100%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 36 },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  info: { padding: 12 },
  category: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '500', color: '#1e293b', marginBottom: 8, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' },
  oldPrice: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  rating: { fontSize: 11, color: '#64748b' },
  sold: { fontSize: 11, color: '#94a3b8' },
});

export default ProductCard;
