import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất', style: 'destructive',
        onPress: () => {
          AsyncStorage.multiRemove(['token', 'refreshToken']);
          dispatch(logout());
        },
      },
    ]);
  };

  const menuItems = [
    { icon: '📋', label: 'Đơn hàng của tôi', onPress: () => navigation.navigate('Orders') },
    { icon: '📍', label: 'Địa chỉ giao hàng', onPress: () => navigation.navigate('Addresses') },
    { icon: '💬', label: 'Tin nhắn', onPress: () => navigation.navigate('Chat') },
    { icon: '🏪', label: 'Shop yêu thích', onPress: () => navigation.navigate('FollowedShops') },
    { icon: '⚙️', label: 'Cài đặt', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cá nhân</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Người dùng'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          {user?.role === 'ADMIN' && (
            <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('AdminDashboard')}>
              <Text style={styles.adminBtnText}>🛠️ Quản trị</Text>
            </TouchableOpacity>
          )}
          {user?.role === 'PARTNER' && (
            <TouchableOpacity style={styles.partnerBtn} onPress={() => navigation.navigate('PartnerDashboard')}>
              <Text style={styles.partnerBtnText}>🏪 Quản lý cửa hàng</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  scroll: { paddingBottom: 24 },
  profileCard: { alignItems: 'center', padding: 24 },
  avatar: { width: 80, height: 80, backgroundColor: '#dbeafe', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#3b82f6' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  adminBtn: { marginTop: 12, backgroundColor: '#fef3c7', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  adminBtnText: { fontSize: 13, fontWeight: '600', color: '#d97706' },
  partnerBtn: { marginTop: 12, backgroundColor: '#dbeafe', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  partnerBtnText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  menu: { paddingHorizontal: 16, marginTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { fontSize: 16, color: '#1e293b', flex: 1 },
  menuArrow: { fontSize: 22, color: '#94a3b8' },
  logoutBtn: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fef2f2', borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
});

export default ProfileScreen;
