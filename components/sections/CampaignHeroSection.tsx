import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Typography, BrandColors } from '@/constants/theme';
import { useCampaign, ActiveCampaign } from '@/context/CampaignContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_WIDTH = SCREEN_WIDTH - 32;
const GRID_GAP = 8;
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP) / 2;
const GRID_CARD_HEIGHT = 90;

// Sub-curation card icons/emojis — maps filterTag or id to an emoji
const SUB_CURATION_ICONS: Record<string, string> = {
  kasavu: '🪷',
  kasavu_sarees: '🪷',
  dress: '👗',
  festive_dresses: '👗',
  mundu: '🎭',
  men_traditional: '🎭',
  budget: '💰',
  budget_festive: '💰',
  kids: '🧒',
  streetwear: '🔥',
  oversized: '👕',
  baggy: '👖',
  graphic: '🎨',
  default: '✨',
};

// Sub-curation card background colors (soft festive tones)
const SUB_CURATION_COLORS = [
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' }, // green
  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' }, // amber
  { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239' }, // rose
  { bg: '#F0F9FF', border: '#BAE6FD', text: '#075985' }, // sky
];

function CountdownBadge({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endDate) return;
    const updateTimer = () => {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('Sale Ended');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(days > 0 ? `${days}d ${hours}h left` : `${hours}h ${mins}m left`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (!timeLeft) return null;

  return (
    <View style={styles.countdownBadge}>
      <Ionicons name="time-outline" size={10} color="#78350F" />
      <Text style={styles.countdownText}>{timeLeft}</Text>
    </View>
  );
}

export default function CampaignHeroSection() {
  const { activeCampaign, activeCampaigns = [], hasCampaign } = useCampaign();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const scrollRef = useRef<ScrollView>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const campaigns = activeCampaigns.length > 0 ? activeCampaigns : (activeCampaign ? [activeCampaign] : []);

  // Entry animation
  useEffect(() => {
    if (hasCampaign) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasCampaign]);

  // Auto-scroll carousel if multiple campaigns exist
  useEffect(() => {
    if (campaigns.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % campaigns.length;
        scrollRef.current?.scrollTo({ x: next * HERO_WIDTH, animated: true });
        return next;
      });
    }, 5500);
    return () => clearInterval(timer);
  }, [campaigns.length]);

  if (!hasCampaign || campaigns.length === 0) return null;

  const currentCampaign = campaigns[activeIndex] || campaigns[0];
  const theme = currentCampaign.theme || {
    primaryColor: '#0F172A',
    secondaryColor: '#EF4444',
    bgGradientStart: '#0F172A',
    bgGradientEnd: '#1E293B',
    textColor: '#FFFFFF',
  };
  const subCurations = currentCampaign.subCurations || [];

  const handleCampaignPress = (camp: ActiveCampaign) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (camp.slug) {
      router.push(`/campaign/${camp.slug}` as any);
    } else {
      router.push({
        pathname: '/(app)/search-results',
        params: {
          collectionId: camp._id || camp.slug,
          title: camp.name,
        },
      } as any);
    }
  };

  const handleSubCurationPress = (sub: any, camp: ActiveCampaign) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (camp.slug) {
      router.push({
        pathname: `/campaign/${camp.slug}`,
        params: {
          subCurationId: sub.id,
          title: `${camp.name} - ${sub.label}`,
        },
      } as any);
    } else {
      router.push({
        pathname: '/(app)/search-results',
        params: {
          collectionId: camp._id || camp.slug,
          query: sub.filterTag || undefined,
          title: `${camp.name} - ${sub.label}`,
          gender: sub.gender || undefined,
          categoryId: sub.categoryId || undefined,
        },
      } as any);
    }
  };

  const handleCopyCoupon = async (code?: string) => {
    const couponToCopy = code || currentCampaign.attachedCouponCode;
    if (!couponToCopy) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(couponToCopy);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 3000);
  };

  const renderBannerCard = (camp: ActiveCampaign, idx: number) => {
    const bannerUrl = camp.heroBannerImage?.url || camp.bannerImage?.url || camp.heroBanner?.imageUrl || camp.banner?.imageUrl;
    const campTheme = camp.theme || theme;

    return (
      <TouchableOpacity
        key={camp._id || camp.slug || idx}
        activeOpacity={0.92}
        onPress={() => handleCampaignPress(camp)}
        style={[styles.heroCard, campaigns.length > 1 && { width: HERO_WIDTH }]}
      >
        <LinearGradient
          colors={[campTheme.bgGradientStart || '#0F172A', campTheme.bgGradientEnd || '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {bannerUrl ? (
            <Image
              source={{ uri: bannerUrl }}
              style={styles.heroBannerImage}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.heroBannerFallback}>
              <Text style={[styles.heroBadge, { backgroundColor: campTheme.primaryColor }]}>
                {camp.badgeText || '✨ SPECIAL CURATION'}
              </Text>
              <Text style={[styles.heroTitle, { color: campTheme.textColor }]}>
                {camp.name}
              </Text>
              {camp.tagline ? (
                <Text style={[styles.heroTagline, { color: campTheme.secondaryColor }]}>
                  {camp.tagline}
                </Text>
              ) : null}
            </View>
          )}

          {/* Countdown badge if scheduled */}
          {camp.schedule?.endDate ? (
            <CountdownBadge endDate={camp.schedule.endDate} />
          ) : null}

          {/* Overlay badge on banner image */}
          {bannerUrl && camp.badgeText ? (
            <View style={[styles.overlayBadge, { backgroundColor: campTheme.primaryColor }]}>
              <Text style={styles.overlayBadgeText}>{camp.badgeText}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Hero Banner (Single or Multi-Campaign Carousel) */}
      {campaigns.length > 1 ? (
        <View>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            onMomentumScrollEnd={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              const idx = Math.round(offset / HERO_WIDTH);
              if (idx >= 0 && idx < campaigns.length) {
                setActiveIndex(idx);
              }
            }}
          >
            {campaigns.map((camp, idx) => renderBannerCard(camp, idx))}
          </ScrollView>

          {/* Carousel Dot Indicators */}
          <View style={styles.carouselIndicators}>
            {campaigns.map((camp, idx) => (
              <TouchableOpacity
                key={`dot-${camp._id || camp.slug || idx}`}
                onPress={() => {
                  scrollRef.current?.scrollTo({ x: idx * HERO_WIDTH, animated: true });
                  setActiveIndex(idx);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.indicatorDot,
                  idx === activeIndex && [
                    styles.indicatorActive,
                    { backgroundColor: theme.primaryColor || BrandColors.matteBlack },
                  ],
                ]}
              />
            ))}
          </View>
        </View>
      ) : (
        renderBannerCard(campaigns[0], 0)
      )}

      {/* 2×2 Sub-Curation Grid (for current campaign) */}
      {subCurations.length > 0 && (
        <View style={styles.gridContainer}>
          {subCurations.slice(0, 4).map((sub, idx) => {
            const colors = SUB_CURATION_COLORS[idx % SUB_CURATION_COLORS.length];
            const icon = SUB_CURATION_ICONS[sub.id] || SUB_CURATION_ICONS[sub.filterTag || ''] || SUB_CURATION_ICONS.default;

            return (
              <TouchableOpacity
                key={sub.id || idx}
                activeOpacity={0.85}
                onPress={() => handleSubCurationPress(sub, currentCampaign)}
                style={[
                  styles.gridCard,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.gridCardEmoji}>{icon}</Text>
                <Text style={[styles.gridCardLabel, { color: colors.text }]} numberOfLines={2}>
                  {sub.label}
                </Text>
                {sub.maxPrice ? (
                  <View style={[styles.priceBadge, { backgroundColor: colors.border }]}>
                    <Text style={[styles.priceBadgeText, { color: colors.text }]}>
                      Under ₹{sub.maxPrice}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* "See All" link for current campaign */}
      <TouchableOpacity
        onPress={() => handleCampaignPress(currentCampaign)}
        style={styles.seeAllRow}
        activeOpacity={0.7}
      >
        <Text style={[styles.seeAllText, { color: BrandColors.matteBlack }]}>
          Explore All {currentCampaign.name} →
        </Text>
      </TouchableOpacity>

      {/* 1-Tap Coupon Strip (for current campaign) */}
      {currentCampaign.attachedCouponCode ? (
        <TouchableOpacity
          onPress={() => handleCopyCoupon(currentCampaign.attachedCouponCode)}
          activeOpacity={0.85}
          style={styles.couponStrip}
        >
          <LinearGradient
            colors={[theme.bgGradientStart, '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.couponGradient}
          >
            <View style={styles.couponLeft}>
              <View style={[styles.couponIcon, { backgroundColor: theme.bgGradientEnd }]}>
                <MaterialCommunityIcons name="ticket-percent" size={16} color={theme.primaryColor} />
              </View>
              <View>
                <Text style={styles.couponLabel}>Special Coupon Code</Text>
                <Text style={[styles.couponCode, { color: theme.primaryColor }]}>
                  {currentCampaign.attachedCouponCode}
                </Text>
              </View>
            </View>
            <View style={[styles.tapToCopy, copiedCoupon && { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.tapToCopyText, copiedCoupon && { color: '#059669' }]}>
                {copiedCoupon ? 'COPIED ✓' : 'TAP TO COPY'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroGradient: {
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBannerImage: {
    width: '100%',
    height: 170,
    borderRadius: 20,
  },
  heroBannerFallback: {
    padding: 24,
    paddingVertical: 30,
    alignItems: 'flex-start',
  },
  heroBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.extraBold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  heroTagline: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    marginTop: 4,
  },
  countdownBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#78350F',
    letterSpacing: 0.3,
  },
  overlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overlayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 2,
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  indicatorActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: 10,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    height: GRID_CARD_HEIGHT,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  gridCardEmoji: {
    fontSize: 20,
  },
  gridCardLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.extraBold,
    lineHeight: 15,
    letterSpacing: -0.2,
  },
  priceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priceBadgeText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 0.3,
  },
  seeAllRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 0.2,
  },
  couponStrip: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 2,
  },
  couponGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  couponIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  couponCode: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: 1,
  },
  tapToCopy: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  tapToCopyText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#B45309',
    letterSpacing: 0.5,
  },
});
