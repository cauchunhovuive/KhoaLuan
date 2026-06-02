import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BannerSlider = ({ navigation }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get('/banners')
      .then(({ data }) => {
        setBanners(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-play
  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  // Scroll to current
  useEffect(() => {
    if (scrollRef.current && banners.length > 0) {
      scrollRef.current.scrollTo({ x: current * SCREEN_WIDTH, animated: true });
    }
  }, [current, banners.length]);

  const handlePress = (banner) => {
    if (banner.linkUrl && navigation) {
      navigation.navigate(banner.linkUrl.replace('/', ''));
    }
  };

  if (loading) {
    return <View style={[styles.container, styles.skeleton]} />;
  }

  if (banners.length === 0) {
    return (
      <View style={styles.fallbackBanner}>
        <Text style={styles.fallbackTitle}>🛍️ KhoaLuan</Text>
        <Text style={styles.fallbackSub}>Mua Sắm Thông Minh - Với Gợi Ý Cá Nhân Hóa</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrent(page);
        }}
      >
        {banners.map((banner, idx) => (
          <TouchableOpacity key={banner.id || idx} activeOpacity={0.9} onPress={() => handlePress(banner)}>
            <Image
              source={{ uri: banner.imageUrl }}
              style={[styles.bannerImage, { width: SCREEN_WIDTH }]}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerContent}>
                {banner.subtitle && <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>}
                {banner.title && <Text style={styles.bannerTitle}>{banner.title}</Text>}
                <Text style={styles.bannerCta}>{banner.linkText || 'Khám phá ngay →'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dots */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.dot, idx === current && styles.dotActive]}
              onPress={() => setCurrent(idx)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 220, position: 'relative' },
  skeleton: { backgroundColor: '#e2e8f0', borderRadius: 16, marginBottom: 16 },
  fallbackBanner: { height: 200, backgroundColor: '#3b82f6', borderRadius: 16, justifyContent: 'center', alignItems: 'center', padding: 20, marginBottom: 16 },
  fallbackTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  fallbackSub: { fontSize: 14, color: '#bfdbfe', textAlign: 'center' },

  bannerImage: { height: 220 },
  bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 20, paddingHorizontal: 20 },
  bannerContent: {},
  bannerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  bannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  bannerCta: { fontSize: 13, color: '#93c5fd', fontWeight: '500' },

  dotsContainer: { position: 'absolute', bottom: 8, right: 16, flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 24, backgroundColor: '#fff' },
});

export default BannerSlider;
