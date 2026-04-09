import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffers } from '../../context/OffersContext';
import { useGender } from '../../context/GenderContext';
import { GenderThemes } from '../../constants/theme';
import { Offer } from '../../api/offers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

/**
 * OfferBanner — Horizontal scrollable offer cards for the home screen.
 * Shows flash sales, first-time user offers, and category offers.
 */
export default function OfferBanner() {
  const { flashSales, offers } = useOffers();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Combine flash sales + top eligible offers (max 5)
  const displayOffers = [
    ...flashSales,
    ...offers.filter(o => !o.isFlashSale && !o.requiresCoupon && o.eligible !== false).slice(0, 3),
  ].slice(0, 5);

  // Auto-scroll
  useEffect(() => {
    if (displayOffers.length <= 1) return;
    const timer = setInterval(() => {
      const nextIdx = (activeIndex + 1) % displayOffers.length;
      scrollRef.current?.scrollTo({ x: nextIdx * (CARD_WIDTH + 12), animated: true });
      setActiveIndex(nextIdx);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeIndex, displayOffers.length]);

  if (displayOffers.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="pricetags" size={16} color={theme.primary} />
          <Text style={styles.headerTitle}>Offers For You</Text>
        </View>
        <Text style={styles.headerCount}>{displayOffers.length} offers</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
          setActiveIndex(idx);
        }}
      >
        {displayOffers.map((offer, idx) => (
          <OfferCard key={offer._id || idx} offer={offer} theme={theme} />
        ))}
      </ScrollView>

      {/* Dots */}
      {displayOffers.length > 1 && (
        <View style={styles.dotsRow}>
          {displayOffers.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === activeIndex && { backgroundColor: theme.primary, width: 16 },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function OfferCard({ offer, theme }: { offer: Offer; theme: any }) {
  const config = getOfferConfig(offer.type);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!offer.isFlashSale) return;
    const timer = setInterval(() => {
      const diff = new Date(offer.endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); clearInterval(timer); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m left`);
    }, 1000);
    return () => clearInterval(timer);
  }, [offer]);

  return (
    <View style={[styles.card, { borderColor: config.border }]}>
      <View style={[styles.cardGradient, { backgroundColor: config.bg }]}>
        {/* Tag */}
        <View style={[styles.tag, { backgroundColor: config.tagBg }]}>
          <Ionicons name={config.icon as any} size={12} color="#fff" />
          <Text style={styles.tagText}>{config.label}</Text>
        </View>

        <Text style={[styles.cardTitle, { color: config.titleColor }]} numberOfLines={2}>
          {offer.title}
        </Text>

        {offer.description ? (
          <Text style={styles.cardDesc} numberOfLines={1}>{offer.description}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          {offer.couponCode && (
            <View style={styles.couponBox}>
              <Text style={[styles.couponLabel, { color: config.titleColor }]}>Code: </Text>
              <Text style={[styles.couponCode, { color: config.titleColor }]}>{offer.couponCode}</Text>
            </View>
          )}
          {offer.isFlashSale && timeLeft && (
            <View style={styles.flashTimer}>
              <Ionicons name="time" size={12} color="#DC2626" />
              <Text style={styles.flashText}>{timeLeft}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function getOfferConfig(type: string) {
  switch (type) {
    case 'FLASH_SALE':
      return { bg: '#FEF2F2', border: '#FECACA', tagBg: '#DC2626', titleColor: '#991B1B', icon: 'flash', label: 'FLASH SALE' };
    case 'FIRST_TIME_USER':
      return { bg: '#F0FDF4', border: '#BBF7D0', tagBg: '#16A34A', titleColor: '#166534', icon: 'gift', label: 'FIRST ORDER' };
    case 'CART_VALUE':
      return { bg: '#FFF7ED', border: '#FED7AA', tagBg: '#EA580C', titleColor: '#9A3412', icon: 'cart', label: 'CART OFFER' };
    case 'CATEGORY':
      return { bg: '#EFF6FF', border: '#BFDBFE', tagBg: '#2563EB', titleColor: '#1E40AF', icon: 'pricetag', label: 'CATEGORY' };
    case 'VENDOR_DISCOUNT':
      return { bg: '#F5F3FF', border: '#DDD6FE', tagBg: '#7C3AED', titleColor: '#5B21B6', icon: 'storefront', label: 'STORE DEAL' };
    case 'VENDOR_MIN_ORDER':
      return { bg: '#ECFDF5', border: '#A7F3D0', tagBg: '#059669', titleColor: '#065F46', icon: 'bicycle', label: 'FREE DELIVERY' };
    case 'VENDOR_CLEARANCE':
      return { bg: '#FEFCE8', border: '#FDE68A', tagBg: '#CA8A04', titleColor: '#854D0E', icon: 'flame', label: 'CLEARANCE' };
    default:
      return { bg: '#F1F5F9', border: '#E2E8F0', tagBg: '#475569', titleColor: '#1E293B', icon: 'pricetags', label: 'OFFER' };
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  couponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed',
  },
  couponLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  couponCode: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  flashTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  flashText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
});
