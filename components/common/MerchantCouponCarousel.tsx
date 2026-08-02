import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Clipboard,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/theme';
import { useToast } from '@/context/AlertContext';
import CouponDetailModal from '@/components/modals/CouponDetailModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

interface MerchantCouponCarouselProps {
  offers: any[];
  theme: any;
  onApplyOffer?: (offerId: string) => void;
  appliedOfferIds?: string[];
}

export default function MerchantCouponCarousel({
  offers,
  theme,
  onApplyOffer,
  appliedOfferIds = [],
}: MerchantCouponCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const showToast = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoScroll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!offers || offers.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % offers.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * (CARD_WIDTH + 12),
          animated: true,
        });
        return nextIndex;
      });
    }, 3500);
  };

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [offers]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (CARD_WIDTH + 12));
    if (index !== activeIndex && index >= 0 && index < offers.length) {
      setActiveIndex(index);
    }
  };

  const handleScrollBeginDrag = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleScrollEndDrag = () => {
    startAutoScroll();
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Clipboard.setString(code);
    showToast({ message: `Coupon code "${code}" copied!`, type: 'success' });
  };

  const handleOpenDetail = (offer: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOffer(offer);
    setModalVisible(true);
  };

  if (!offers || offers.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 0, gap: 12 }}
      >
        {offers.map((offer: any, idx: number) => {
          const code = offer.couponCode || offer.code;
          const isApplied = appliedOfferIds.includes(
            offer._id?.toString() || offer.offerId?.toString()
          );

          const offerTag =
            offer.discountAmount
              ? `Save ₹${offer.discountAmount}`
              : offer.discountType === 'percentage'
              ? `${offer.discountValue}% OFF`
              : offer.discountValue
              ? `FLAT ₹${offer.discountValue} OFF`
              : 'Special Offer';

          return (
            <TouchableOpacity
              key={offer._id || idx}
              activeOpacity={0.9}
              onPress={() => handleOpenDetail(offer)}
              style={[
                styles.couponTicket,
                {
                  width: CARD_WIDTH,
                  backgroundColor: theme.primary + '0C',
                  borderColor: theme.primary + '30',
                },
              ]}
            >
              {/* Semicircle Punches */}
              <View
                style={[
                  styles.ticketPunchLeft,
                  { backgroundColor: '#fff', borderColor: theme.primary + '30' },
                ]}
              />
              <View
                style={[
                  styles.ticketPunchRight,
                  { backgroundColor: '#fff', borderColor: theme.primary + '30' },
                ]}
              />

              <View style={styles.couponLeft}>
                <View style={[styles.couponDot, { backgroundColor: theme.primary }]} />
                <View style={styles.couponMain}>
                  <Text style={[styles.couponTitle, { color: theme.primary }]} numberOfLines={1}>
                    {offer.title}
                  </Text>
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerBadgeText}>{offerTag}</Text>
                  </View>
                </View>
              </View>

              {code ? (
                <View style={styles.couponRight}>
                  <View style={[styles.dashedDivider, { borderColor: theme.primary + '40' }]} />
                  <TouchableOpacity
                    style={[styles.couponCodeBadge, { backgroundColor: theme.primary }]}
                    activeOpacity={0.75}
                    onPress={() => handleOpenDetail(offer)}
                  >
                    <Ionicons name="pricetag-outline" size={11} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.couponCodeText}>{code}</Text>
                  </TouchableOpacity>
                </View>
              ) : onApplyOffer ? (
                <View style={styles.couponRight}>
                  <View style={[styles.dashedDivider, { borderColor: theme.primary + '40' }]} />
                  <TouchableOpacity
                    style={[
                      styles.couponCodeBadge,
                      { backgroundColor: isApplied ? '#10B981' : theme.primary },
                    ]}
                    onPress={() => onApplyOffer(offer._id)}
                  >
                    <Text style={styles.couponCodeText}>{isApplied ? 'Applied' : 'Apply'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.couponRight}>
                  <View style={[styles.dashedDivider, { borderColor: theme.primary + '40' }]} />
                  <View style={[styles.couponCodeBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.couponCodeText}>DETAILS</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Pagination Dots */}
      {offers.length > 1 && (
        <View style={styles.paginationDots}>
          {offers.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === activeIndex
                  ? { backgroundColor: theme.primary, width: 16 }
                  : { backgroundColor: '#CBD5E1', width: 6 },
              ]}
            />
          ))}
        </View>
      )}

      {/* Detail Popup Modal */}
      <CouponDetailModal
        visible={modalVisible}
        offer={selectedOffer}
        theme={theme}
        onClose={() => setModalVisible(false)}
        onApplyOffer={onApplyOffer}
        isApplied={
          selectedOffer &&
          appliedOfferIds.includes(
            selectedOffer._id?.toString() || selectedOffer.offerId?.toString()
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  couponTicket: {
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  ticketPunchLeft: {
    position: 'absolute',
    left: -8,
    top: 26,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  ticketPunchRight: {
    position: 'absolute',
    right: -8,
    top: 26,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  couponLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  couponDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  couponMain: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
  offerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B98115',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  offerBadgeText: {
    fontSize: 7,
    fontFamily: Typography.fontFamily.bold,
    color: '#059669',
  },
  couponRight: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingLeft: 8,
  },
  dashedDivider: {
    width: 1,
    height: '60%',
    borderStyle: 'dashed',
    borderWidth: 0.5,
    marginRight: 10,
  },
  couponCodeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponCodeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
