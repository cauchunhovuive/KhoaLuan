import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProductDetailScreen = ({ route }) => {
  const { product } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <View style={styles.image} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{product?.name || 'Tên sản phẩm'}</Text>
        <Text style={styles.price}>
          {(product?.price || 0).toLocaleString('vi-VN')}₫
        </Text>
        <Text style={styles.description}>
          Mô tả sản phẩm sẽ được hiển thị ở đây.
        </Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Thêm vào giỏ hàng</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  imageContainer: { padding: 16 },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#F1F5F9', borderRadius: 16 },
  content: { padding: 16 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#3B82F6', marginBottom: 16 },
  description: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 24 },
  button: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default ProductDetailScreen;
