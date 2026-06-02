import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Switch,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminSettingsScreen = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data.data);
    } catch { Toast.show({ type: 'error', text1: 'Không thể tải cài đặt' }); }
    finally { setLoading(false); }
  };

  const handleChange = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/settings', settings);
      setSettings(data.data);
      Toast.show({ type: 'success', text1: 'Đã lưu cài đặt' });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    } finally { setSaving(false); }
  };

  if (loading) return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />;
  if (!settings) return <View style={styles.container}><Text style={{ textAlign: 'center', marginTop: 40, color: '#94A3B8' }}>Không thể tải cài đặt</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Cài đặt hệ thống</Text>
          <TouchableOpacity onPress={loadSettings}><Text style={{ color: '#3B82F6', fontSize: 13 }}>🔄 Tải lại</Text></TouchableOpacity>
        </View>

        {/* General */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt chung</Text>
          <Text style={styles.label}>Tên website</Text>
          <TextInput style={styles.input} value={settings.siteName} onChangeText={(t) => handleChange('siteName', t)} />
          <Text style={styles.label}>Mô tả</Text>
          <TextInput style={[styles.input, { height: 60 }]} value={settings.siteDescription} onChangeText={(t) => handleChange('siteDescription', t)} multiline />
          <Text style={styles.label}>SP mỗi trang</Text>
          <TextInput style={styles.input} value={String(settings.itemsPerPage || '')} onChangeText={(t) => handleChange('itemsPerPage', parseInt(t) || 0)} keyboardType="numeric" />
        </View>

        {/* ML Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Machine Learning</Text>
          <View style={styles.switchRow}>
            <Text style={{ flex: 1, fontSize: 14, color: '#1E293B' }}>Bật gợi ý sản phẩm</Text>
            <Switch value={settings.enableRecommendations} onValueChange={(v) => handleChange('enableRecommendations', v)} />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ flex: 1, fontSize: 14, color: '#1E293B' }}>Bật phân cụm khách hàng</Text>
            <Switch value={settings.enableClustering} onValueChange={(v) => handleChange('enableClustering', v)} />
          </View>
        </View>

        {/* Shipping */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vận chuyển</Text>
          <Text style={styles.label}>Miễn phí ship cho đơn trên (₫)</Text>
          <TextInput style={styles.input} value={String(settings.freeShippingThreshold || '')} onChangeText={(t) => handleChange('freeShippingThreshold', parseInt(t) || 0)} keyboardType="numeric" />
          <Text style={styles.label}>Phí ship mặc định (₫)</Text>
          <TextInput style={styles.input} value={String(settings.shippingFee || '')} onChangeText={(t) => handleChange('shippingFee', parseInt(t) || 0)} keyboardType="numeric" />
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={settings.siteContactEmail} onChangeText={(t) => handleChange('siteContactEmail', t)} keyboardType="email-address" />
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput style={styles.input} value={settings.siteContactPhone} onChangeText={(t) => handleChange('siteContactPhone', t)} />
          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput style={styles.input} value={settings.siteContactAddress} onChangeText={(t) => handleChange('siteContactAddress', t)} />
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? '💾 Đang lưu...' : '💾 Lưu cài đặt'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  label: { fontSize: 12, fontWeight: '500', color: '#475569', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 13, color: '#1E293B' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  saveBtn: { backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default AdminSettingsScreen;
