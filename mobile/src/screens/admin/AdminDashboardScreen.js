import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AdminDashboardScreen = ({ navigation }) => {
  const stats = [
    { label: 'Người dùng', value: '0', color: '#3B82F6' },
    { label: 'Sản phẩm', value: '0', color: '#8B5CF6' },
    { label: 'Đơn hàng', value: '0', color: '#10B981' },
    { label: 'Doanh thu', value: '0₫', color: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminProducts')}>
            <Text style={styles.menuText}>Quản lý sản phẩm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Quản lý đơn hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Phân cụm khách hàng</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  statCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, width: '47%', borderLeftWidth: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  statLabel: { fontSize: 14, color: '#64748B', marginTop: 4 },
  menuSection: { padding: 16 },
  menuItem: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  menuText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
});

export default AdminDashboardScreen;
