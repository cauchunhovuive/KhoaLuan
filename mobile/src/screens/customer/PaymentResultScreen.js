import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

const PaymentResultScreen = ({ navigation }) => {
  const route = useRoute();
  const params = route.params || {};
  const success = params.success === true || params.status === 'success';
  const message = params.message || '';
  const orderId = params.orderId || '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {/* Icon */}
        <View style={[styles.iconCircle, success ? styles.successCircle : styles.failCircle]}>
          <Text style={styles.iconText}>{success ? '✓' : '✕'}</Text>
        </View>

        <Text style={[styles.title, success ? styles.successTitle : styles.failTitle]}>
          {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </Text>

        <Text style={styles.message}>
          {message || (success ? 'Cảm ơn bạn đã mua hàng!' : 'Vui lòng thử lại sau.')}
        </Text>

        {orderId ? (
          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Mã đơn hàng</Text>
            <Text style={styles.orderId}>#{orderId.slice(0, 8)}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {orderId && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('OrderDetail', { orderId })}
            >
              <Text style={styles.primaryBtnText}>Xem đơn hàng</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.secondaryBtnText}>Về trang chủ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successCircle: { backgroundColor: '#d1fae5' },
  failCircle: { backgroundColor: '#fee2e2' },
  iconText: { fontSize: 36, fontWeight: 'bold' },
  successTitle: { color: '#059669' },
  failTitle: { color: '#dc2626' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  orderInfo: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, width: '100%', alignItems: 'center', marginBottom: 24 },
  orderLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  orderId: { fontSize: 16, fontWeight: '600', color: '#1e293b', fontFamily: 'monospace' },
  actions: { width: '100%', gap: 10 },
  primaryBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#475569', fontSize: 16, fontWeight: '500' },
});

export default PaymentResultScreen;
