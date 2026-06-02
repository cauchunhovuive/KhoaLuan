import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.arrow, page <= 1 && styles.disabled]}
        onPress={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <Text style={[styles.arrowText, page <= 1 && styles.disabledText]}>‹</Text>
      </TouchableOpacity>

      {getPageNumbers().map((p, idx) => (
        p === '...' ? (
          <Text key={`dots-${idx}`} style={styles.dots}>...</Text>
        ) : (
          <TouchableOpacity
            key={p}
            style={[styles.pageBtn, p === page && styles.pageBtnActive]}
            onPress={() => onPageChange(p)}
          >
            <Text style={[styles.pageText, p === page && styles.pageTextActive]}>{p}</Text>
          </TouchableOpacity>
        )
      ))}

      <TouchableOpacity
        style={[styles.arrow, page >= totalPages && styles.disabled]}
        onPress={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        <Text style={[styles.arrowText, page >= totalPages && styles.disabledText]}>›</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 4 },
  arrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  disabled: { opacity: 0.4 },
  arrowText: { fontSize: 20, color: '#475569', fontWeight: '600' },
  disabledText: { color: '#cbd5e1' },
  dots: { paddingHorizontal: 8, color: '#94a3b8', fontSize: 14 },
  pageBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  pageBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  pageText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  pageTextActive: { color: '#fff' },
});

export default Pagination;
