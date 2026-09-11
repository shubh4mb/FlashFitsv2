import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Clipboard,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/theme';
import { useCampaign } from '@/context/CampaignContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
  default: '✨',
};

// Sub-curation card background colors (soft festive tones)
const SUB_CURATION_COLORS = [
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' }, // green
  { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' }, // amber
  { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239' }, // rose
  { bg: '#F0F9FF', border: '#BAE6FD', text: '#075985' }, // sky
];

export default function CampaignHeroSection() {
  const { activeCampaign, hasCampaign } = useCampaign();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

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

  // Countdown
  useEffect(() => {
    if (!activeCampaign?.schedule?.endDate) return;

    const updateTimer = () => {
      const end = new Date(activeCampaign.schedule!.endDate!).getTime();
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
  }, [activeCampaign?.schedule?.endDate]);

  if (!hasCampaign || !activeCampaign) return null;

  const theme = activeCampaign.theme;
  const bannerUrl = activeCampaign.heroBannerImage?.url || activeCampaign.bannerImage?.url;
  const subCurations = activeCampaign.subCurations || [];

  const handleCampaignPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(app)/search-results',
      params: {
        collectionId: activeCampaign._id || activeCampaign.slug,
        title: activeCampaign.name,
      },
    } as any);
  };

  const handleSubCurationPress = (sub: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(app)/search-results',
      params: {
        collectionId: activeCampaign._id || activeCampaign.slug,
        query: sub.filterTag || undefined,
        title: `${activeCampaign.name} - ${sub.label}`,
        gender: sub.gender || undefined,
        categoryId: sub.categoryId || undefined,
      },
    } as any);
  };

  const handleCopyCoupon = () => {
    if (!activeCampaign.attachedCouponCode) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Clipboard.setString(activeCampaign.attachedCouponCode);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 3000);
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
      {/* Hero Banner Card */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handleCampaignPress}
        style={styles.heroCard}
      >
        <LinearGradient
          colors={[theme.bgGradientStart, theme.bgGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Banner Image */}
          {bannerUrl ? (
            <Image
              source={{ uri: bannerUrl }}
              style={styles.heroBannerImage}
              contentFit="cover"
              transition={400}
            />
          ) : (
            /* Fallback: Themed gradient with text */
            <View style={styles.heroBannerFallback}>
              <Text style={[styles.heroBadge, { backgroundColor: theme.primaryColor }]}>
                {activeCampaign.badgeText || '✨ FESTIVE SALE'}
              </Text>
              <Text style={[styles.heroTitle, { color: theme.textColor }]}>
                {activeCampaign.name}
              </Text>
              {activeCampaign.tagline ? (
                <Text style={[styles.heroTagline, { color: theme.secondaryColor }]}>
                  {activeCampaign.tagline}
                </Text>
              ) : null}
            </View>
          )}

          {/* Countdown badge */}
          {timeLeft ? (
            <View style={styles.countdownBadge}>
              <Ionicons name="time-outline" size={10} color="#78350F" />
              <Text style={styles.countdownText}>{timeLeft}</Text>
            </View>
          ) : null}

          {/* Overlay badge on banner image */}
          {bannerUrl && activeCampaign.badgeText ? (
            <View style={[styles.overlayBadge, { backgroundColor: theme.primaryColor }]}>
              <Text style={styles.overlayBadgeText}>{activeCampaign.badgeText}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>

      {/* 2×2 Sub-Curation Grid (Swiggy Style) */}
      {subCurations.length > 0 && (
        <View style={styles.gridContainer}>
          {subCurations.slice(0, 4).map((sub, idx) => {
            const colors = SUB_CURATION_COLORS[idx % SUB_CURATION_COLORS.length];
            const icon = SUB_CURATION_ICONS[sub.id] || SUB_CURATION_ICONS[sub.filterTag || ''] || SUB_CURATION_ICONS.default;

            return (
              <TouchableOpacity
                key={sub.id}
                activeOpacity={0.85}
                onPress={() => handleSubCurationPress(sub)}
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

      {/* "See All" link */}
      <TouchableOpacity
        onPress={handleCampaignPress}
        style={styles.seeAllRow}
        activeOpacity={0.7}
      >
        <Text style={[styles.seeAllText, { color: theme.primaryColor }]}>
          Explore All {activeCampaign.name} →
        </Text>
      </TouchableOpacity>

      {/* 1-Tap Coupon Strip */}
      {activeCampaign.attachedCouponCode ? (
        <TouchableOpacity
          onPress={handleCopyCoupon}
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
                <Text style={styles.couponLabel}>Festival Special Code</Text>
                <Text style={[styles.couponCode, { color: theme.primaryColor }]}>
                  {activeCampaign.attachedCouponCode}
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
