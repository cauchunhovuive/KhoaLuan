import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProductListScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // TODO: Fetch products from API
    setProducts([
      { id: '1', name: 'Sản phẩm 1', price: 250000, sold: 120, rating: 4.5 },
      { id: '2', name: 'Sản phẩm 2', price: 350000, sold: 89, rating: 4.8 },
      { id: '3', name: 'Sản phẩm 3', price: 180000, sold: 200, rating: 4.2 },
    ]);
  }, []);

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
      <View style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')}₫</Text>
        <Text style={styles.productMeta}>⭐ {item.rating} | Đã bán {item.sold}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sản phẩm</Text>
      </View>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  list: { padding: 16 },
  productCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  productImage: { width: 80, height: 80, backgroundColor: '#F1F5F9', borderRadius: 8, marginRight: 12 },
  productInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#3B82F6', marginBottom: 4 },
  productMeta: { fontSize: 12, color: '#64748B' },
});

export default ProductListScreen;
