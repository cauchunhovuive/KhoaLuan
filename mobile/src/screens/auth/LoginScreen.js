import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../store/authSlice';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    const result = await dispatch(login({ email: email.trim(), password }));
    if (login.rejected.match(result)) {
      Alert.alert('Đăng nhập thất bại', result.payload || 'Sai email hoặc mật khẩu');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🛍️</Text>
          <Text style={styles.title}>KhoaLuan</Text>
          <Text style={styles.subtitle}>Đăng nhập để mua sắm</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="nhap@email.com"
            value={email}
            onChangeText={(t) => { setEmail(t); dispatch(clearError()); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => { setPassword(t); dispatch(clearError()); }}
            secureTextEntry
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
            <Text style={styles.linkText}>
              Chưa có tài khoản? <Text style={styles.linkHighlight}>Đăng ký</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#3b82f6' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 4 },
  error: { color: '#ef4444', fontSize: 13, marginTop: 4 },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#64748b', fontSize: 14 },
  linkHighlight: { color: '#3b82f6', fontWeight: '600' },
});

export default LoginScreen;
