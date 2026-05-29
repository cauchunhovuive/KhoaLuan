import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = ({ navigation }) => {
  const categories = ['Thời trang', 'Điện tử', 'Gia dụng', 'Sách', 'Thể thao', 'Làm đẹp'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Xin chào!</Text>
          <Text style={styles.title}>KhoaLuan</Text>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Mua Sắm Thông Minh</Text>
          <Text style={styles.bannerSubtitle}>Với Gợi Ý Cá Nhân Hóa</Text>
          <TouchableOpacity style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>Khám phá ngay</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat, idx) => (
              <TouchableOpacity key={idx} style={styles.categoryItem}>
                <Text style={styles.categoryText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sản phẩm bán chạy</Text>
          <TouchableOpacity style={styles.viewAll} onPress={() => navigation.navigate('Products')}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, paddingBottom: 16 },
  greeting: { fontSize: 16, color: '#64748B' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E293B' },
  banner: { backgroundColor: '#3B82F6', margin: 16, padding: 24, borderRadius: 16 },
  bannerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  bannerSubtitle: { fontSize: 16, color: '#BFDBFE', marginBottom: 16 },
  bannerButton: { backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignSelf: 'flex-start' },
  bannerButtonText: { color: '#3B82F6', fontWeight: '600' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryItem: { backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  categoryText: { color: '#475569', fontSize: 14 },
  viewAll: { alignItems: 'center', paddingVertical: 8 },
  viewAllText: { color: '#3B82F6', fontSize: 14, fontWeight: '500' },
});

export default HomeScreen;
