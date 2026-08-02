import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/theme';
import { useToast } from '@/context/AlertContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const INK = '#0B0B0F';
const MUTED = '#64748B';
const LIGHT_BG = '#F8FAFC';
const LINE = '#E2E8F0';

interface CouponDetailModalProps {
  visible: boolean;
  offer: any | null;
  theme?: any;
  onClose: () => void;
  onApplyOffer?: (offerId: string) => void;
  isApplied?: boolean;
}

export default function CouponDetailModal({
  visible,
  offer,
  theme,
  onClose,
  onApplyOffer,
  isApplied = false,
}: CouponDetailModalProps) {
  const showToast = useToast();
  const [copied, setCopied] = useState(false);

  if (!offer) return null;

  const primaryColor = theme?.primary || '#10B981';
  const code = offer.couponCode || offer.code;

  const handleCopyCode = () => {
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Clipboard.setString(code);
    setCopied(true);
    showToast({ message: `Coupon code "${code}" copied!`, type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyOffer && offer._id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onApplyOffer(offer._id);
      onClose();
    } else if (code) {
      handleCopyCode();
    }
  };

  // Format valid dates if present
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formattedEndDate = formatDate(offer.endDate);
  const minSpend = offer.conditions?.minCartValue || offer.conditions?.minOrderValue;

  const discountText =
    offer.discountType === 'percentage'
      ? `${offer.discountValue}% OFF${
          offer.maxDiscount ? ` (Up to ₹${offer.maxDiscount})` : ''
        }`
      : offer.discountValue
      ? `Flat ₹${offer.discountValue} OFF`
      : offer.discountAmount
      ? `Save ₹${offer.discountAmount}`
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Top Accent Line */}
              <View style={[styles.topAccent, { backgroundColor: primaryColor }]} />

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={INK} />
              </TouchableOpacity>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
              >
                {/* Header Badge & Title */}
                <View style={styles.headerArea}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: primaryColor + '18' },
                    ]}
                  >
                    <Ionicons name="pricetag" size={24} color={primaryColor} />
                  </View>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  {!!discountText && (
                    <View
                      style={[
                        styles.discountBadge,
                        { backgroundColor: primaryColor + '15' },
                      ]}
                    >
                      <Text
                        style={[styles.discountBadgeText, { color: primaryColor }]}
                      >
                        {discountText}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Coupon Code Container */}
                {code ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleCopyCode}
                    style={[
                      styles.codeContainer,
                      { borderColor: primaryColor + '50' },
                    ]}
                  >
                    <View style={styles.codeLeft}>
                      <Text style={styles.codeLabel}>COUPON CODE</Text>
                      <Text style={styles.codeValue}>{code}</Text>
                    </View>

                    <View
                      style={[
                        styles.copyBtn,
                        { backgroundColor: copied ? '#10B981' : primaryColor },
                      ]}
                    >
                      <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color="#FFF"
                      />
                      <Text style={styles.copyBtnText}>
                        {copied ? 'COPIED' : 'COPY'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Full Description */}
                {!!offer.description && (
                  <View style={styles.descSection}>
                    <Text style={styles.sectionHeaderTitle}>ABOUT THIS OFFER</Text>
                    <Text style={styles.descriptionText}>{offer.description}</Text>
                  </View>
                )}

                {/* Terms & Rules List */}
                <View style={styles.termsSection}>
                  <Text style={styles.sectionHeaderTitle}>OFFER DETAILS & TERMS</Text>

                  {minSpend ? (
                    <View style={styles.termRow}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={primaryColor}
                      />
                      <Text style={styles.termText}>
                        Minimum cart value of{' '}
                        <Text style={styles.boldText}>₹{minSpend}</Text> required.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.termRow}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={primaryColor}
                      />
                      <Text style={styles.termText}>No minimum order value required.</Text>
                    </View>
                  )}

                  {formattedEndDate && (
                    <View style={styles.termRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={primaryColor}
                      />
                      <Text style={styles.termText}>
                        Valid till <Text style={styles.boldText}>{formattedEndDate}</Text>
                      </Text>
                    </View>
                  )}

                  {offer.applicableTo && (
                    <View style={styles.termRow}>
                      <Ionicons
                        name="flash-outline"
                        size={16}
                        color={primaryColor}
                      />
                      <Text style={styles.termText}>
                        Applicable on{' '}
                        <Text style={styles.boldText}>
                          {offer.applicableTo === 'try_and_buy'
                            ? 'Try & Buy Orders'
                            : offer.applicableTo === 'courier'
                            ? 'Courier Orders'
                            : 'All Delivery Options'}
                        </Text>
                      </Text>
                    </View>
                  )}

                  {offer.conditions?.firstTimeUserOnly && (
                    <View style={styles.termRow}>
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color={primaryColor}
                      />
                      <Text style={styles.termText}>Valid for first-time customers only.</Text>
                    </View>
                  )}

                  {offer.freeDelivery && (
                    <View style={styles.termRow}>
                      <Ionicons
                        name="bicycle-outline"
                        size={16}
                        color={primaryColor}
                      />
                      <Text style={styles.termText}>Includes Free Delivery.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Bottom Action CTA */}
              <View style={styles.bottomBar}>
                <TouchableOpacity
                  style={[
                    styles.primaryCta,
                    {
                      backgroundColor: isApplied
                        ? '#10B981'
                        : primaryColor,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={handleApply}
                >
                  <Ionicons
                    name={
                      isApplied
                        ? 'checkmark-circle'
                        : code
                        ? 'copy-outline'
                        : 'pricetag'
                    }
                    size={18}
                    color="#FFF"
                  />
                  <Text style={styles.primaryCtaText}>
                    {isApplied
                      ? 'Coupon Applied'
                      : code
                      ? 'Copy Code & Use'
                      : 'Apply Offer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - 40, 380),
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  topAccent: {
    height: 5,
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  scrollBody: {
    padding: 24,
    paddingTop: 28,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  offerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: INK,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginTop: 4,
  },
  discountBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LIGHT_BG,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  codeLeft: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.bold,
    color: MUTED,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  codeValue: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: INK,
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  descSection: {
    marginBottom: 20,
    backgroundColor: LIGHT_BG,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: MUTED,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: INK,
    lineHeight: 19,
  },
  termsSection: {
    gap: 10,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  termText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#334155',
    flex: 1,
  },
  boldText: {
    fontFamily: Typography.fontFamily.bold,
    color: INK,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: LINE,
    backgroundColor: '#FFFFFF',
  },
  primaryCta: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
  },
});
