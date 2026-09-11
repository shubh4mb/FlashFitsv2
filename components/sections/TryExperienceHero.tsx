import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { useGender } from '@/context/GenderContext';
import { BrandColors, GenderThemes, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StepItem {
  id: number;
  step: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge: string;
  detail: string;
  tip: string;
}

const STEPS: StepItem[] = [
  {
    id: 1,
    step: '01',
    title: 'Pick 6 Fits',
    subtitle: 'Mix sizes & styles',
    icon: 'bag-handle',
    badge: '₹0 Upfront Risk',
    detail: 'Add up to 6 outfits, footwear, or accessories to your Try & Buy cart. Pick two sizes of the same piece to guarantee the perfect fit.',
    tip: '💡 Tip: Footwear counts as 2 slots due to box size.',
  },
  {
    id: 2,
    step: '02',
    title: '60-Min Blitz',
    subtitle: 'Speedy doorstep drop',
    icon: 'flash',
    badge: '⚡ Live Tracking',
    detail: 'Your dedicated delivery partner collects your selection from local verified partner stores and rushes to your location in 60 minutes.',
    tip: '💡 Tip: Real-time map tracking keeps you updated at every step.',
  },
  {
    id: 3,
    step: '03',
    title: '10-Min Trial',
    subtitle: 'Private in-room fitting',
    icon: 'shirt',
    badge: '🪞 Mirror Fitting',
    detail: 'Try on everything in the comfort of your room with your own mirrors, lighting, and matching footwear before making a decision.',
    tip: '💡 Tip: The rider waits outside safely while you try everything on.',
  },
  {
    id: 4,
    step: '04',
    title: 'Pay & Keep',
    subtitle: 'Instant handback',
    icon: 'checkmark-done-circle',
    badge: '🚪 ₹0 Return Hassle',
    detail: 'Keep the pieces you love, hand back what does not fit to the partner on the spot. Pay only for what you keep with zero return paperwork.',
    tip: '💡 Tip: No packing, no shipping labels, no waiting for refund days.',
  },
];

const PERKS = [
  { icon: 'shield-checkmark', label: '100% Genuine' },
  { icon: 'timer-outline', label: '10-Min Trial' },
  { icon: 'swap-horizontal', label: 'Instant Handback' },
  { icon: 'wallet-outline', label: 'Pay On Fit' },
];

export default function TryExperienceHero() {
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const router = useRouter();

  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleStepPress = (stepId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveStep(prev => (prev === stepId ? null : stepId));
  };

  const openModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  };

  const closeModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(false);
  };

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={[
          theme.dark || '#0B1120',
          '#0F172A',
          '#020617',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        {/* Subtle Decorative Ambient Ring */}
        <View style={[styles.ambientGlow, { backgroundColor: theme.accent || '#38BDF8' }]} />
        <View style={styles.ambientGlowSecondary} />

        {/* ── Top Header Row ── */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.pulseLiveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>60-MIN DOORSTEP FITTING</Text>
            </View>
            <View style={styles.brandPill}>
              <Ionicons name="sparkles" size={11} color="#F59E0B" />
              <Text style={styles.brandPillText}>FlashFits Lounge</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openModal}
            style={styles.howItWorksBtn}
          >
            <Text style={styles.howItWorksText}>How it works</Text>
            <Ionicons name="chevron-forward" size={13} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── Headline & Tagline ── */}
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>
            Experience <Text style={{ color: theme.accent || '#38BDF8' }}>Try & Buy</Text>
          </Text>
          <Text style={styles.subTitle}>
            Your personal fitting room delivered to your doorstep in 60 mins. Keep what you love, hand back the rest instantly.
          </Text>
        </View>

        {/* ── 4-Step Interactive Grid ── */}
        <View style={styles.stepsGrid}>
          {STEPS.map((item) => {
            const isSelected = activeStep === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => handleStepPress(item.id)}
                style={[
                  styles.stepCard,
                  isSelected && {
                    borderColor: theme.accent || '#38BDF8',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  },
                ]}
              >
                <View style={styles.stepCardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: isSelected ? (theme.primary || '#1E293B') : 'rgba(255,255,255,0.08)' }]}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isSelected ? (theme.accent || '#38BDF8') : '#FFFFFF'}
                    />
                  </View>
                  <Text style={styles.stepNumber}>{item.step}</Text>
                </View>

                <Text style={styles.stepTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.stepSubtitle} numberOfLines={1}>{item.subtitle}</Text>

                <View style={[styles.microBadge, isSelected && { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                  <Text style={[styles.microBadgeText, isSelected && { color: theme.accent || '#38BDF8' }]}>
                    {item.badge}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Active Step Quick Detail Callout (If Tapped) ── */}
        {activeStep !== null && (
          <Animated.View
            entering={FadeInDown.duration(250)}
            style={styles.detailCallout}
          >
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderLeft}>
                <Ionicons name="information-circle" size={16} color={theme.accent || '#38BDF8'} />
                <Text style={styles.detailHeading}>
                  {STEPS.find(s => s.id === activeStep)?.title} Breakdown
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveStep(null)}>
                <Ionicons name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.detailText}>
              {STEPS.find(s => s.id === activeStep)?.detail}
            </Text>
            <Text style={styles.detailTip}>
              {STEPS.find(s => s.id === activeStep)?.tip}
            </Text>
          </Animated.View>
        )}

        {/* ── Perks Horizontal Strip ── */}
        <View style={styles.perksRow}>
          {PERKS.map((perk, index) => (
            <View key={index} style={styles.perkItem}>
              <Ionicons name={perk.icon as any} size={12} color="#10B981" />
              <Text style={styles.perkText}>{perk.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Full Interactive "How Try & Buy Works" Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
          />
          <View style={styles.modalContent}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>How Try & Buy Works</Text>
                <Text style={styles.modalHeaderSub}>Doorstep fashion trial in 4 simple steps</Text>
              </View>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScroll}
            >
              {STEPS.map((step, idx) => (
                <View key={step.id} style={styles.modalStepCard}>
                  <View style={styles.modalStepLeft}>
                    <View style={[styles.modalStepIconBg, { backgroundColor: theme.primary || '#0F172A' }]}>
                      <Ionicons name={step.icon} size={20} color={theme.accent || '#38BDF8'} />
                    </View>
                    {idx < STEPS.length - 1 && <View style={styles.modalConnectorLine} />}
                  </View>

                  <View style={styles.modalStepRight}>
                    <View style={styles.modalStepTitleRow}>
                      <Text style={styles.modalStepNumber}>STEP {step.step}</Text>
                      <View style={styles.modalBadge}>
                        <Text style={styles.modalBadgeText}>{step.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.modalStepTitle}>{step.title}</Text>
                    <Text style={styles.modalStepDetail}>{step.detail}</Text>
                    <View style={styles.modalTipBox}>
                      <Text style={styles.modalTipText}>{step.tip}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Guarantees Box */}
              <View style={styles.guaranteeBox}>
                <View style={styles.guaranteeHeader}>
                  <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                  <Text style={styles.guaranteeTitle}>The FlashFits Promise</Text>
                </View>
                <Text style={styles.guaranteeText}>
                  • ₹0 Return hassle: hand unwanted items back directly to the rider.{'\n'}
                  • Only pay for what you decide to keep after trying.{'\n'}
                  • 100% authentic inventory directly from verified local brand retail stores.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Action CTA */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={closeModal}
                style={[styles.modalCtaBtn, { backgroundColor: BrandColors.primary }]}
              >
                <Text style={styles.modalCtaText}>START SHOPPING</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  gradientCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.15,
  },
  ambientGlowSecondary: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F59E0B',
    opacity: 0.08,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pulseLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#34D399',
    letterSpacing: 0.6,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  brandPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#F1F5F9',
  },
  howItWorksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  howItWorksText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#CBD5E1',
  },
  titleContainer: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 21,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16.5,
  },

  /* 4-Step Grid */
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  stepCard: {
    width: (SCREEN_WIDTH - 32 - 36 - 8) / 2, // 2-column layout inside card
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.extraBold,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    marginBottom: 8,
  },
  microBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  microBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#E2E8F0',
  },

  /* Detail Callout */
  detailCallout: {
    marginTop: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailHeading: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  detailText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 6,
  },
  detailTip: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#F59E0B',
  },

  /* Perks Row */
  perksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perkText: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#0F172A',
  },
  modalHeaderSub: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 20,
  },
  modalStepCard: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  modalStepLeft: {
    alignItems: 'center',
    marginRight: 14,
  },
  modalStepIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: -8,
  },
  modalStepRight: {
    flex: 1,
    paddingTop: 2,
  },
  modalStepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  modalStepNumber: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    letterSpacing: 1,
  },
  modalBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#2563EB',
  },
  modalStepTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  modalStepDetail: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.regular,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  modalTipBox: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  modalTipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#B45309',
  },
  guaranteeBox: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 8,
    marginBottom: 10,
  },
  guaranteeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#166534',
  },
  guaranteeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#15803D',
    lineHeight: 18,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  modalCtaText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
});
