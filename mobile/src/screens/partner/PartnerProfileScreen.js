import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../services/api';
import { fetchCurrentUser } from '../../store/authSlice';
import Toast from 'react-native-toast-message';

const PartnerProfileScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    storeName: '', storeDescription: '', taxCode: '', businessAddress: '', phone: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        storeName: user.storeName || '',
        storeDescription: user.storeDescription || '',
        taxCode: user.taxCode || '',
        businessAddress: user.businessAddress || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/partner/profile', form);
      Toast.show({ type: 'success', text1: 'Cập nhật thành công' });
      await dispatch(fetchCurrentUser());
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally { setSaving(false); }
  };

  const approvalStatus = user?.isApproved
    ? { label: 'Đã được phê duyệt', color: '#059669', bg: '#D1FAE5', icon: '✅' }
    : { label: 'Đang chờ phê duyệt', color: '#D97706', bg: '#FEF3C7', icon: '⏳' };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>🏪 Hồ sơ cửa hàng</Text>
          <Text style={styles.subtitle}>Quản lý thông tin kinh doanh của bạn</Text>
        </View>

        {/* Approval Status */}
        <View style={[styles.statusBanner, { backgroundColor: approvalStatus.bg }]}>
          <Text style={styles.statusIcon}>{approvalStatus.icon}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.statusLabel, { color: approvalStatus.color }]}>{approvalStatus.label}</Text>
            {!user?.isApproved && (
              <Text style={[styles.statusDesc, { color: approvalStatus.color }]}>Sau khi duyệt, bạn có thể đăng sản phẩm</Text>
            )}
            {user?.isApproved && user?.approvedAt && (
              <Text style={[styles.statusDesc, { color: approvalStatus.color }]}>
                Phê duyệt ngày {new Date(user.approvedAt).toLocaleDateString('vi-VN')}
              </Text>
            )}
          </View>
        </View>

        {/* Store Header */}
        <View style={styles.storeHeader}>
          <View style={[styles.storeIcon, { backgroundColor: user?.isApproved ? '#D1FAE5' : '#FEF3C7' }]}>
            <Text style={{ fontSize: 28 }}>🏪</Text>
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={styles.storeName}>{form.storeName || 'Cửa hàng của bạn'}</Text>
            <Text style={styles.storeEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Tên cửa hàng *</Text>
          <TextInput style={styles.input} value={form.storeName} onChangeText={(t) => setForm({ ...form, storeName: t })} placeholder="Tên cửa hàng" />

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" placeholder="0123 456 789" />

          <Text style={styles.label}>Mã số thuế</Text>
          <TextInput style={styles.input} value={form.taxCode} onChangeText={(t) => setForm({ ...form, taxCode: t })} placeholder="1234567890" />

          <Text style={styles.label}>Địa chỉ kinh doanh *</Text>
          <TextInput style={styles.input} value={form.businessAddress} onChangeText={(t) => setForm({ ...form, businessAddress: t })} placeholder="123 Nguyễn Huệ, Q.1, TP.HCM" />

          <Text style={styles.label}>Mô tả cửa hàng</Text>
          <TextInput style={[styles.input, styles.textArea]} value={form.storeDescription} onChangeText={(t) => setForm({ ...form, storeDescription: t })} placeholder="Giới thiệu về cửa hàng..." multiline />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 Lưu thay đổi</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  statusBanner: { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'center' },
  statusIcon: { fontSize: 22 },
  statusLabel: { fontSize: 14, fontWeight: '600' },
  statusDesc: { fontSize: 12, marginTop: 2, opacity: 0.8 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  storeIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  storeEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  form: {},
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', color: '#1E293B' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#059669', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default PartnerProfileScreen;
