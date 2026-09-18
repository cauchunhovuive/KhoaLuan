import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { login, clearError } from '../../store/authSlice';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);
    try {
      // Tạo redirect URL mà app có thể nhận diện
      const redirectUrl = Linking.createURL('auth/callback');

      // Lấy backend URL từ config hoặc mặc định
      const API_URL = 'http://localhost:5000';

      // Open browser để xác thực Google
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_URL}/api/auth/google?redirect_uri=${encodeURIComponent(redirectUrl)}`,
        redirectUrl,
        { preferEphemeralSession: true }
      );

      if (result.type === 'success') {
        const url = result.url;
        // Parse token và refreshToken từ URL
        const params = new URLSearchParams(url.split('?')[1] || '');
        const token = params.get('token');
        const refreshToken = params.get('refreshToken');

        if (token) {
          // Lưu token và fetch user
          await AsyncStorage.setItem('token', token);
          if (refreshToken) {
            await AsyncStorage.setItem('refreshToken', refreshToken);
          }

          // Gọi API lấy thông tin user
          try {
            const { data } = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            // Dispatch login thành công
            dispatch({
              type: 'auth/login/fulfilled',
              payload: {
                user: data.data,
                token,
                refreshToken,
              },
            });
          } catch (err) {
            // Nếu fetch user thất bại, vẫn set token
            dispatch({
              type: 'auth/login/fulfilled',
              payload: {
                user: { email: '' },
                token,
                refreshToken,
              },
            });
          }
        } else {
          Alert.alert('Lỗi', 'Không nhận được token từ Google');
        }
      } else if (result.type !== 'cancel') {
        Alert.alert('Lỗi', 'Đăng nhập Google thất bại');
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể kết nối đến Google');
    } finally {
      setGoogleLoading(false);
    }
  }, [dispatch]);

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

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Login Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <View style={styles.googleButtonContent}>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Đăng nhập với Google</Text>
              </View>
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { marginHorizontal: 16, fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  googleButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  googleButtonContent: { flexDirection: 'row', alignItems: 'center' },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 10,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  googleButtonText: { color: '#1e293b', fontSize: 15, fontWeight: '500' },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#64748b', fontSize: 14 },
  linkHighlight: { color: '#3b82f6', fontWeight: '600' },
});

export default LoginScreen;
