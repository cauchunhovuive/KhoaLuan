import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, updateCartItem, removeFromCart } from '../../store/cartSlice';
import LoadingSpinner from '../../components/LoadingSpinner';

const CartScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items, total, loading } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, []);

  const handleRemove = (productId) => {
    Alert.alert('Xác nhận', 'Xoá sản phẩm này khỏi giỏ hàng?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: () => dispatch(removeFromCart(productId)) },
    ]);
  };

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Giỏ hàng</Text>
        {items.length > 0 && <Text style={styles.count}>{items.length} sản phẩm</Text>}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Giỏ hàng trống</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopBtnText}>Mua sắm ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.product?.id || item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const unitPrice = item.effectivePrice || item.product?.discountPrice || item.product?.price || 0;
              const hasFlash = !!item.flashSale;
              return (
                <View style={styles.cartItem}>
                  {item.product?.images?.[0] ? (
                    <Image source={{ uri: item.product.images[0] }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}><Text>🛍️</Text></View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.product?.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.itemPrice}>{unitPrice?.toLocaleString('vi-VN')}₫</Text>
                      {hasFlash && <Text style={styles.flashBadge}>⚡ Flash</Text>}
                    </View>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        onPress={() => item.quantity > 1 && dispatch(updateCartItem({ productId: item.product.id, quantity: item.quantity - 1 }))}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qty}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => dispatch(updateCartItem({ productId: item.product.id, quantity: item.quantity + 1 }))}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemove(item.product?.id)} style={styles.deleteBtn}>
                        <Text style={styles.deleteText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />

          {/* Bottom */}
          <View style={styles.bottom}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tạm tính:</Text>
              <Text style={styles.totalPrice}>{total?.toLocaleString('vi-VN')}₫</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate('Checkout')}>
              <Text style={styles.checkoutText}>Thanh toán ({items.length})</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  count: { fontSize: 14, color: '#64748b' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#64748b', marginBottom: 20 },
  shopBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  shopBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  list: { padding: 16 },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  itemImage: { width: 80, height: 80, borderRadius: 12 },
  itemImagePlaceholder: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '500', color: '#1e293b', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' },
  flashBadge: { fontSize: 10, color: '#ef4444', backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  qtyBtn: { width: 32, height: 32, backgroundColor: '#f1f5f9', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, color: '#475569', fontWeight: '500' },
  qty: { fontSize: 16, fontWeight: '600', color: '#1e293b', width: 30, textAlign: 'center' },
  deleteBtn: { marginLeft: 12, padding: 4 },
  deleteText: { fontSize: 18 },
  bottom: { padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 16, color: '#475569' },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: '#3b82f6' },
  checkoutBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default CartScreen;
