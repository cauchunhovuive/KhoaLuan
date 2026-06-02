import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Switch, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from 'react-native-toast-message';

const LABELS = [
  { value: 'Nhà', icon: '🏠' },
  { value: 'Cơ quan', icon: '💼' },
  { value: 'Khác', icon: '⭐' },
];

const AddressForm = ({ address, onClose, onSaved }) => {
  const [form, setForm] = useState({
    label: address?.label || 'Nhà',
    fullName: address?.fullName || '',
    phone: address?.phone || '',
    street: address?.street || '',
    ward: address?.ward || '',
    district: address?.district || '',
    city: address?.city || '',
    isDefault: address?.isDefault || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.street || !form.city) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ');
      return;
    }
    setSaving(true);
    try {
      if (address) {
        await api.put(`/addresses/${address.id}`, form);
        Toast.show({ type: 'success', text1: 'Đã cập nhật địa chỉ' });
      } else {
        await api.post('/addresses', form);
        Toast.show({ type: 'success', text1: 'Đã thêm địa chỉ' });
      }
      onSaved();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: err.response?.data?.message || 'Lưu thất bại' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>{address ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>Loại địa chỉ</Text>
      <View style={styles.labelRow}>
        {LABELS.map(lbl => (
          <TouchableOpacity
            key={lbl.value}
            style={[styles.labelChip, form.label === lbl.value && styles.labelChipActive]}
            onPress={() => setForm({ ...form, label: lbl.value })}
          >
            <Text style={[styles.labelChipText, form.label === lbl.value && styles.labelChipTextActive]}>
              {lbl.icon} {lbl.value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inputLabel}>Người nhận *</Text>
      <TextInput style={styles.input} value={form.fullName} onChangeText={(t) => setForm({ ...form, fullName: t })} placeholder="Nguyễn Văn A" placeholderTextColor="#94a3b8" />

      <Text style={styles.inputLabel}>Số điện thoại *</Text>
      <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="0912345678" placeholderTextColor="#94a3b8" keyboardType="phone-pad" />

      <Text style={styles.inputLabel}>Địa chỉ *</Text>
      <TextInput style={styles.input} value={form.street} onChangeText={(t) => setForm({ ...form, street: t })} placeholder="Số nhà, tên đường" placeholderTextColor="#94a3b8" />

      <View style={styles.cityRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>Phường/Xã</Text>
          <TextInput style={styles.input} value={form.ward} onChangeText={(t) => setForm({ ...form, ward: t })} placeholder="Phường 1" placeholderTextColor="#94a3b8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>Quận/Huyện</Text>
          <TextInput style={styles.input} value={form.district} onChangeText={(t) => setForm({ ...form, district: t })} placeholder="Quận 1" placeholderTextColor="#94a3b8" />
        </View>
      </View>

      <Text style={styles.inputLabel}>Thành phố *</Text>
      <TextInput style={styles.input} value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} placeholder="TP. HCM" placeholderTextColor="#94a3b8" />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Đặt làm mặc định</Text>
        <Switch value={form.isDefault} onValueChange={(v) => setForm({ ...form, isDefault: v })} trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }} thumbColor={form.isDefault ? '#3b82f6' : '#cbd5e1'} />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{address ? 'Cập nhật' : 'Thêm địa chỉ'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const AddressManagementScreen = ({ navigation }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/addresses');
      setAddresses(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAddresses(); }, []);

  const handleDelete = (id) => {
    Alert.alert('Xác nhận', 'Xoá địa chỉ này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        try { await api.delete(`/addresses/${id}`); Toast.show({ type: 'success', text1: 'Đã xoá' }); fetchAddresses(); }
        catch { Toast.show({ type: 'error', text1: 'Xoá thất bại' }); }
      }},
    ]);
  };

  const handleSetDefault = async (id) => {
    try { await api.put(`/addresses/${id}`, { isDefault: true }); fetchAddresses(); }
    catch { Toast.show({ type: 'error', text1: 'Cập nhật thất bại' }); }
  };

  const renderAddress = ({ item }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <Text style={styles.addressLabel}>📍 {item.label || 'Địa chỉ'}</Text>
        {item.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Mặc định</Text></View>}
      </View>
      <Text style={styles.addressName}>{item.fullName}{item.phone ? ` | ${item.phone}` : ''}</Text>
      <Text style={styles.addressDetail}>{item.street}{item.ward ? `, ${item.ward}` : ''}{item.district ? `, ${item.district}` : ''}</Text>
      <Text style={styles.addressCity}>{item.city}</Text>
      <View style={styles.addressActions}>
        {!item.isDefault && (
          <TouchableOpacity onPress={() => handleSetDefault(item.id)} style={styles.actionBtn}>
            <Text style={styles.actionText}>Mặc định</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => { setEditingAddr(item); setShowForm(true); }} style={styles.actionBtn}>
          <Text style={[styles.actionText, { color: '#3b82f6' }]}>Sửa</Text>
        </TouchableOpacity>
        {!item.isDefault && (
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Xoá</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (showForm) {
    return (
      <SafeAreaView style={styles.container}>
        <AddressForm
          address={editingAddr}
          onClose={() => { setShowForm(false); setEditingAddr(null); }}
          onSaved={() => { setShowForm(false); setEditingAddr(null); fetchAddresses(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Địa chỉ giao hàng</Text>
          <Text style={styles.subtitle}>{addresses.length} địa chỉ đã lưu</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingAddr(null); setShowForm(true); }}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {loading ? <LoadingSpinner /> : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderAddress}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyText}>Chưa có địa chỉ nào</Text>
              <Text style={styles.emptySubtext}>Thêm địa chỉ giao hàng để thanh toán nhanh hơn</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

  addressCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  addressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addressLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  defaultBadge: { marginLeft: 8, backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  defaultText: { fontSize: 10, fontWeight: '600', color: '#3b82f6' },
  addressName: { fontSize: 14, color: '#475569', marginBottom: 2 },
  addressDetail: { fontSize: 13, color: '#64748b' },
  addressCity: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addressActions: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 8 },
  actionBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: '500', color: '#64748b' },

  // Form
  formContainer: { flex: 1, padding: 20 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  closeBtn: { fontSize: 20, color: '#94a3b8', padding: 4 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
  labelRow: { flexDirection: 'row', gap: 8 },
  labelChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  labelChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  labelChipText: { fontSize: 13, color: '#475569' },
  labelChipTextActive: { color: '#fff' },
  cityRow: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  switchLabel: { fontSize: 14, color: '#475569' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default AddressManagementScreen;
