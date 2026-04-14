import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Text,
} from 'react-native';
import { useOffers } from '../../context/OffersContext';
import { useRouter } from 'expo-router';
import Skeleton from '../common/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 200;

export default function PromotionalCarousel() {
  const { promotionalBanners } = useOffers();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-scroll logic
  useEffect(() => {
    if (promotionalBanners.length <= 1) return;
    const timer = setInterval(() => {
      const nextIdx = (activeIndex + 1) % promotionalBanners.length;
      scrollRef.current?.scrollTo({ x: nextIdx * SCREEN_WIDTH, animated: true });
      setActiveIndex(nextIdx);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeIndex, promotionalBanners.length]);

  const handleBannerPress = (offer: any) => {
    // If it's a collection offer, navigate to search with collection filter
    if (offer.conditions?.collectionId) {
      router.push({
        pathname: '/(app)/search-results',
        params: { 
          collectionId: offer.conditions.collectionId,
          title: offer.title 
        }
      });
    } else if (offer.scope === 'merchant' && offer.merchantId) {
        router.push(`/(app)/merchant/${offer.merchantId}`);
    }
  };

  if (promotionalBanners.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(idx);
        }}
      >
        {promotionalBanners.map((banner) => (
          <TouchableOpacity
            key={banner._id}
            activeOpacity={0.9}
            onPress={() => handleBannerPress(banner)}
            style={styles.bannerWrapper}
          >
            {banner.bannerImage?.url ? (
              <Image
                source={{ uri: banner.bannerImage.url }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.bannerImage, styles.placeholder]}>
                <Text style={styles.placeholderText}>{banner.title}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Indicators */}
      {promotionalBanners.length > 1 && (
        <View style={styles.indicatorContainer}>
          {promotionalBanners.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.indicator,
                idx === activeIndex && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
    marginBottom: 20,
  },
  bannerWrapper: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  indicatorContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#fff',
    width: 16,
  },
});
