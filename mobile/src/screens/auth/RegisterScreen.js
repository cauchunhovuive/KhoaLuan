import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../../store/authSlice';

const RegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    const result = await dispatch(register(form));
    if (register.rejected.match(result)) {
      Alert.alert('Đăng ký thất bại', result.payload || 'Vui lòng thử lại');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🛍️</Text>
          <Text style={styles.title}>Đăng ký</Text>
          <Text style={styles.subtitle}>Tạo tài khoản mới</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Họ tên *</Text>
          <TextInput style={styles.input} placeholder="Nguyễn Văn A" value={form.name} onChangeText={(t) => updateField('name', t)} />

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} placeholder="nhap@email.com" value={form.email} onChangeText={(t) => updateField('email', t)} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput style={styles.input} placeholder="0123 456 789" value={form.phone} onChangeText={(t) => updateField('phone', t)} keyboardType="phone-pad" />

          <Text style={styles.label}>Mật khẩu *</Text>
          <TextInput style={styles.input} placeholder="••••••••" value={form.password} onChangeText={(t) => updateField('password', t)} secureTextEntry />

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng ký</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkWrap}>
            <Text style={styles.linkText}>Đã có tài khoản? <Text style={styles.linkHighlight}>Đăng nhập</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16 },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#64748b', fontSize: 14 },
  linkHighlight: { color: '#3b82f6', fontWeight: '600' },
});

export default RegisterScreen;
