import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Modal,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/theme';
import { fetchPromotions, PromoAnnouncement } from '@/api/promotions';

interface SlimFreeDeliveryBannerProps {
  style?: object;
  breakoutPadding?: number;
  direction?: 'ltr' | 'rtl';
  speed?: number;
}

const DEFAULT_PROMOTIONS: PromoAnnouncement[] = [
  {
    id: 'promo_free_delivery',
    badge: '2 FREE DELIVERIES',
    title: '2 Free Deliveries on your first 2 orders!',
    subtitle: 'Auto-applied at checkout • ₹0 delivery fee',
    highlightText: '2 Free Deliveries',
    actionUrl: '',
    icon: 'flash',
    isActive: true,
    order: 0,
  },
  {
    id: 'promo_refer_earn',
    badge: 'REFER & EARN',
    title: 'Refer a friend & get a free delivery coupon!',
    subtitle: 'Tap to share code • Earn +1 free delivery',
    highlightText: '+1 Free Delivery',
    actionUrl: '/(app)/refer-earn',
    icon: 'gift',
    isActive: true,
    order: 1,
  },
];

export default function SlimFreeDeliveryBanner({
  style,
  breakoutPadding,
  direction = 'rtl',
  speed = 42,
}: SlimFreeDeliveryBannerProps) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [promotions, setPromotions] = useState<PromoAnnouncement[]>(DEFAULT_PROMOTIONS);
  const [selectedPromo, setSelectedPromo] = useState<PromoAnnouncement>(DEFAULT_PROMOTIONS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const animatedX = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  // Fetch dynamic promotions from Admin/Backend
  useEffect(() => {
    let isMounted = true;
    const loadPromos = async () => {
      try {
        const remotePromos = await fetchPromotions();
        if (isMounted && Array.isArray(remotePromos) && remotePromos.length > 0) {
          setPromotions(remotePromos);
        }
      } catch (err) {
        // Fallback to default promotions
      }
    };
    loadPromos();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter active promotions
  const activePromos = useMemo(() => {
    const valid = promotions.filter((p) => p.isActive !== false);
    return valid.length > 0 ? valid : DEFAULT_PROMOTIONS;
  }, [promotions]);

  // Ensure the track has enough items to span across screens smoothly
  const trackItems = useMemo(() => {
    let items = [...activePromos];
    while (items.length < 3) {
      items = [...items, ...activePromos];
    }
    return items;
  }, [activePromos]);

  // Infinite horizontal marquee loop
  useEffect(() => {
    if (trackWidth <= 0) return;

    const fromVal = direction === 'ltr' ? -trackWidth : 0;
    const toVal = direction === 'ltr' ? 0 : -trackWidth;
    const duration = Math.max(5000, (trackWidth / speed) * 1000);

    animatedX.setValue(fromVal);

    const anim = Animated.loop(
      Animated.timing(animatedX, {
        toValue: toVal,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    anim.start();

    return () => {
      anim.stop();
    };
  }, [trackWidth, direction, speed]);

  const handleItemPress = (promo: PromoAnnouncement) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (promo.actionUrl && promo.actionUrl.trim() !== '') {
      router.push(promo.actionUrl.trim() as any);
    } else {
      setSelectedPromo(promo);
      setIsModalOpen(true);
    }
  };

  // Badge gradient colors depending on promo badge/type
  const getBadgeColors = (badge: string): readonly [string, string] => {
    const upper = (badge || '').toUpperCase();
    if (upper.includes('REFER') || upper.includes('GIFT') || upper.includes('COUPON')) {
      return ['#FBBF24', '#F59E0B'] as const; // Warm Gold
    }
    if (upper.includes('SALE') || upper.includes('OFF') || upper.includes('DISCOUNT')) {
      return ['#F43F5E', '#E11D48'] as const; // Rose/Red
    }
    return ['#00F5FF', '#00C2E8'] as const; // Signature Cyan
  };

  const breakoutStyle = breakoutPadding
    ? {
        width: windowWidth,
        marginLeft: -breakoutPadding,
      }
    : null;

  const renderPromoItem = (promo: PromoAnnouncement, key: string) => {
    const badgeColors = getBadgeColors(promo.badge);
    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.82}
        onPress={() => handleItemPress(promo)}
        style={styles.promoChip}
      >
        {/* Badge Pill */}
        <View style={styles.badgePill}>
          <LinearGradient
            colors={badgeColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badgeGradient}
          >
            <Ionicons
              name={promo.icon === 'gift' ? 'gift' : 'flash'}
              size={11}
              color="#05131E"
            />
            <Text style={styles.badgeText}>{promo.badge}</Text>
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.mainText}>{promo.title}</Text>

        {/* Subtitle */}
        {promo.subtitle ? (
          <Text style={styles.subText}>{promo.subtitle}</Text>
        ) : null}

        {/* Action arrow chip */}
        <View style={styles.actionArrowCircle}>
          <Ionicons name="chevron-forward" size={10} color="#00F5FF" />
        </View>

        {/* Separator Diamond */}
        <Text style={styles.separatorDiamond}>✦</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, breakoutStyle, style]}>
      <LinearGradient
        colors={['#07121D', '#0D1E30', '#07121D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientContainer}
      >
        {/* Left & Right Soft Edge Fades */}
        <LinearGradient
          colors={['#07121D', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fadeLeft}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', '#07121D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fadeRight}
          pointerEvents="none"
        />

        {/* Continuous Horizontal Marquee Belt */}
        <Animated.View
          style={[
            styles.marqueeTrackWrapper,
            { transform: [{ translateX: animatedX }] },
          ]}
        >
          {/* Track 1 (Measured via onLayout) */}
          <View
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              if (w > 0 && Math.abs(w - trackWidth) > 2) {
                setTrackWidth(w);
              }
            }}
            style={styles.marqueeTrack}
          >
            {trackItems.map((promo, idx) => renderPromoItem(promo, `t1-${idx}`))}
          </View>

          {/* Track 2 (Identical duplicate for seamless continuous looping) */}
          <View style={styles.marqueeTrack}>
            {trackItems.map((promo, idx) => renderPromoItem(promo, `t2-${idx}`))}
          </View>
        </Animated.View>
      </LinearGradient>

      {/* ── Informative Promo Details Modal ── */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header Badge */}
            <View style={styles.modalIconWrap}>
              <LinearGradient
                colors={getBadgeColors(selectedPromo.badge)}
                style={styles.modalIconGradient}
              >
                <Ionicons
                  name={selectedPromo.icon === 'gift' ? 'gift' : 'flash'}
                  size={28}
                  color="#05131E"
                />
              </LinearGradient>
            </View>

            <Text style={styles.modalTitle}>
              {selectedPromo.badge.includes('REFER')
                ? 'Refer & Earn Free Delivery! 🎁'
                : '2 Free Deliveries on Us! 🎉'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedPromo.badge.includes('REFER')
                ? 'Share your unique referral code with friends. When they place their first order, both of you earn a free delivery coupon!'
                : 'Welcome offer: As a FlashFits member, your first two orders automatically receive 100% free delivery.'}
            </Text>

            <View style={styles.modalHighlights}>
              <View style={styles.highlightRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.highlightRowText}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>Zero Code Needed:</Text> Automatically applied at checkout
                </Text>
              </View>
              <View style={styles.highlightRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.highlightRowText}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>Doorstep Try & Buy:</Text> Try outfits at home with 30-minute doorstep trial
                </Text>
              </View>
              <View style={styles.highlightRow}>
                <Ionicons name="gift-outline" size={18} color="#0284C7" />
                <Text style={styles.highlightRowText}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>Want more?</Text> Refer friends to earn +1 free delivery coupon each!
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalReferBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setIsModalOpen(false);
                  router.push('/(app)/refer-earn' as any);
                }}
              >
                <LinearGradient
                  colors={['#00C2E8', '#0088B8']}
                  style={styles.modalReferBtnGradient}
                >
                  <Ionicons name="gift-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalReferBtnText}>Refer & Earn More</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDismissBtn}
                activeOpacity={0.7}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.modalDismissText}>Got it, Thanks!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'stretch',
    marginHorizontal: 0,
    marginVertical: 0,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: 'rgba(0, 245, 255, 0.22)',
    backgroundColor: '#07121D',
    ...Platform.select({
      ios: {
        shadowColor: '#00C2E8',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gradientContainer: {
    width: '100%',
    minHeight: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  marqueeTrackWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 99999,
  },
  marqueeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  badgePill: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 8,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    gap: 3,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#05131E',
    letterSpacing: 0.3,
  },
  mainText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: -0.1,
    marginRight: 6,
  },
  subText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    letterSpacing: -0.1,
    marginRight: 6,
  },
  actionArrowCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    marginRight: 10,
  },
  separatorDiamond: {
    fontSize: 10,
    color: '#00F5FF',
    opacity: 0.5,
    marginRight: 12,
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 5,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 5,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
  },
  modalIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  modalHighlights: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightRowText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#334155',
    lineHeight: 16,
  },
  modalButtonsRow: {
    width: '100%',
    gap: 8,
  },
  modalReferBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalReferBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  modalReferBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  modalDismissBtn: {
    width: '100%',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDismissText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#64748B',
  },
});
