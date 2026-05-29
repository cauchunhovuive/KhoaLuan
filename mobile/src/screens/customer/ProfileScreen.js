import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cá nhân</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Người dùng'}</Text>
        <Text style={styles.email}>{user?.email || 'user@email.com'}</Text>
      </View>

      <View style={styles.menu}>
        {[
          { label: 'Thông tin cá nhân', onPress: () => {} },
          { label: 'Đơn hàng của tôi', onPress: () => navigation.navigate('Products') },
          { label: 'Địa chỉ giao hàng', onPress: () => {} },
          { label: 'Cài đặt', onPress: () => {} },
        ].map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
            <Text style={styles.menuItemText}>{item.label}</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  profileCard: { alignItems: 'center', padding: 24 },
  avatar: { width: 80, height: 80, backgroundColor: '#DBEAFE', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#3B82F6' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  email: { fontSize: 14, color: '#64748B' },
  menu: { padding: 16 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  menuItemText: { fontSize: 16, color: '#1E293B' },
  menuItemArrow: { fontSize: 24, color: '#94A3B8' },
  logoutButton: { margin: 16, backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});

export default ProfileScreen;
