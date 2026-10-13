import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors, GenderThemes, Typography } from '@/constants/theme';
import { useGender, SubGender } from '@/context/GenderContext';

const { width } = Dimensions.get('window');

interface KidsComingSoonSectionProps {
  tabType?: 'tryAndBuy' | 'explore' | 'flashmart' | 'categories';
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function KidsComingSoonSection({
  tabType = 'tryAndBuy',
}: KidsComingSoonSectionProps) {
  const { selectedGender, setSelectedGender, selectedSubGender, setSelectedSubGender } = useGender();
  const [isNotified, setIsNotified] = useState(false);
  const theme = GenderThemes[selectedGender] || GenderThemes.Kids;

  const handleNotifyPress = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setIsNotified(prev => !prev);
  };

  const handleSubGenderSelect = (sub: SubGender) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedSubGender(sub);
  };

  const handleSwitchGender = (gender: 'Men' | 'Women') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedGender(gender);
  };

  // Dynamic titles and subtitles based on sub-gender & tab
  const getSubGenderDetails = () => {
    if (selectedSubGender === 'Boys') {
      return {
        badge: '👦 BOYS COLLECTION',
        title: 'Boys Styles Dropping Soon',
        tagline: 'Casual tees, denim, party wear & active playwear for boys.',
        highlight: 'Curated fits for little legends',
      };
    }
    if (selectedSubGender === 'Girls') {
      return {
        badge: '👧 GIRLS COLLECTION',
        title: 'Girls Styles Dropping Soon',
        tagline: 'Dresses, trendy sets, ethnic fits & comfy everyday wear for girls.',
        highlight: 'Charming styles for little stars',
      };
    }
    return {
      badge: '✨ KIDS COLLECTION',
      title: 'Kids Fashion Coming Soon',
      tagline: 'Fresh & playful styles curated for boys, girls, and infants.',
      highlight: 'Everyday comfort meets festive glam',
    };
  };

  const getTabContextDescription = () => {
    switch (tabType) {
      case 'flashmart':
        return 'Our FlashMart dark stores are stocking up on high-demand kids fashion essentials. 30-minute trial from local warehouse inventory is on its way!';
      case 'explore':
        return 'We are onboarding boutique kids brands and nationwide collections. Enjoy flat-rate express delivery directly to your doorstep soon!';
      case 'categories':
        return 'Browse through upcoming categories including infant wear, party outfits, sportswear, and footwear for boys & girls.';
      case 'tryAndBuy':
      default:
        return 'Say goodbye to trial room tantrums! Experience 30-minute Doorstep Try & Buy for your little ones—keep what fits, return what doesn’t.';
    }
  };

  const { badge, title, tagline } = getSubGenderDetails();
  const contextDesc = getTabContextDescription();

  return (
    <View style={styles.container}>
      {/* ── Sub-Gender Pill Tabs ── */}
      <View style={styles.subGenderRow}>
        {(['All', 'Boys', 'Girls'] as const).map(sub => {
          const isActive = selectedSubGender === sub;
          return (
            <TouchableOpacity
              key={sub}
              activeOpacity={0.8}
              onPress={() => handleSubGenderSelect(sub)}
              style={[styles.subPill, isActive && styles.subPillActive]}
            >
              <Text style={[styles.subPillText, isActive && styles.subPillTextActive]}>
                {sub === 'All' ? 'All Kids' : sub}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Hero Banner Card ── */}
      <View style={styles.heroCard}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#09131F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Subtle Ambient Glow Circles */}
          <View style={styles.ambientGlowTop} />
          <View style={styles.ambientGlowBottom} />

          {/* Top Badge */}
          <View style={styles.badgeRow}>
            <LinearGradient
              colors={['#00F5FF', '#00C2E8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.heroBadge}
            >
              <Ionicons name="sparkles" size={11} color="#05131E" style={{ marginRight: 4 }} />
              <Text style={styles.heroBadgeText}>{badge}</Text>
            </LinearGradient>

            <View style={styles.statusPill}>
              <View style={styles.livePulseDot} />
              <Text style={styles.statusPillText}>IN PROGRESS</Text>
            </View>
          </View>

          {/* Main Illustration Icon */}
          <View style={styles.iconCircle}>
            <LinearGradient
              colors={['rgba(0, 194, 232, 0.25)', 'rgba(0, 194, 232, 0.05)']}
              style={styles.iconCircleInner}
            >
              <MaterialCommunityIcons
                name={selectedSubGender === 'Boys' ? 'tshirt-crew-outline' : selectedSubGender === 'Girls' ? 'hanger' : 'party-popper'}
                size={40}
                color={BrandColors.primary}
              />
            </LinearGradient>
          </View>

          {/* Titles */}
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroTagline}>{tagline}</Text>
          <Text style={styles.heroDesc}>{contextDesc}</Text>

          {/* VIP Notify Me Button */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleNotifyPress}
            style={styles.notifyButton}
          >
            <LinearGradient
              colors={isNotified ? ['#10B981', '#059669'] : [BrandColors.primary, '#0088B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.notifyGradient}
            >
              <Ionicons
                name={isNotified ? 'checkmark-circle' : 'notifications-outline'}
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.notifyText}>
                {isNotified ? "You're on the VIP Launch List!" : 'Notify Me When Drops Go Live'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* ── Feature Highlights ── */}
      <View style={styles.highlightsContainer}>
        <Text style={styles.sectionHeaderTitle}>What to expect for Kids</Text>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconWrap, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="flash-outline" size={20} color="#0284C7" />
          </View>
          <View style={styles.featureTextWrap}>
            <Text style={styles.featureTitle}>30-Min Doorstep Trial</Text>
            <Text style={styles.featureSubtitle}>
              Try 2-3 sizes comfortably at home. Keep the best fit, return the rest on the spot.
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="storefront-outline" size={20} color="#D97706" />
          </View>
          <View style={styles.featureTextWrap}>
            <Text style={styles.featureTitle}>Verified Kids Outlets</Text>
            <Text style={styles.featureSubtitle}>
              Onboarding partner stores like <Text style={{ fontWeight: '700', color: '#0F172A' }}>E_kid</Text> & premium local kids boutiques.
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconWrap, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="sparkles-outline" size={20} color="#16A34A" />
          </View>
          <View style={styles.featureTextWrap}>
            <Text style={styles.featureTitle}>Ages 0 to 14 Years</Text>
            <Text style={styles.featureSubtitle}>
              Curated everyday sets, party dresses, cotton basics, and celebratory fits.
            </Text>
          </View>
        </View>
      </View>

      {/* ── Quick Switch to Active Collections ── */}
      <View style={styles.switchSection}>
        <Text style={styles.switchHeaderTitle}>In the meantime, explore active collections:</Text>
        <View style={styles.switchButtonsRow}>
          <TouchableOpacity
            style={styles.switchBtn}
            activeOpacity={0.8}
            onPress={() => handleSwitchGender('Men')}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.switchBtnGradient}
            >
              <Ionicons name="male" size={16} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.switchBtnText}>Shop Men</Text>
              <Ionicons name="arrow-forward" size={14} color="#64748B" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            activeOpacity={0.8}
            onPress={() => handleSwitchGender('Women')}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.switchBtnGradient}
            >
              <Ionicons name="female" size={16} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.switchBtnText}>Shop Women</Text>
              <Ionicons name="arrow-forward" size={14} color="#64748B" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  subGenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  subPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  subPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  subPillText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#64748B',
  },
  subPillTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  heroGradient: {
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 194, 232, 0.15)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#05131E',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#FCD34D',
    letterSpacing: 0.4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 194, 232, 0.3)',
  },
  iconCircleInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroTagline: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  heroDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  notifyButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  notifyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  notifyText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  highlightsContainer: {
    marginBottom: 24,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 3,
  },
  featureSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    lineHeight: 17,
  },
  switchSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchHeaderTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#64748B',
    marginBottom: 12,
    textAlign: 'center',
  },
  switchButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  switchBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  switchBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
});
