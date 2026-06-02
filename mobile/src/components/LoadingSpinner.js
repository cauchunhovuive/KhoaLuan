import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

const LoadingSpinner = ({ message }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#3B82F6" />
    {message && <Text style={styles.text}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { marginTop: 12, fontSize: 14, color: '#64748B' },
});

export default LoadingSpinner;
