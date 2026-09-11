import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface OfferItem {
  _id: string;
  title: string;
  description?: string;
  couponCode?: string;
  requiresCoupon?: boolean;
  scope?: 'admin' | 'merchant';
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  discountAmount?: number;
  maxDiscount?: number;
  conditions?: {
    minCartValue?: number;
    minOrderValue?: number;
    [key: string]: any;
  };
  reason?: string;
  [key: string]: any;
}

interface CouponOffersModalProps {
  visible: boolean;
  onClose: () => void;
  offers: OfferItem[];
  appliedOffers: any[];
  appliedCouponCode?: string | null;
  onApplyCoupon: (code: string) => Promise<boolean | void>;
  onApplyOffer: (offer: OfferItem) => Promise<boolean | void>;
  onRemoveOffer?: (offerId: string) => Promise<void>;
  onRemoveCoupon?: () => Promise<void>;
  themeColor?: string;
  orderType?: 'try_and_buy' | 'courier';
  cartTotal?: number;
}

export default function CouponOffersModal({
  visible,
  onClose,
  offers = [],
  appliedOffers = [],
  appliedCouponCode,
  onApplyCoupon,
  onApplyOffer,
  onRemoveOffer,
  onRemoveCoupon,
  themeColor = '#0F172A',
  orderType = 'try_and_buy',
  cartTotal = 0,
}: CouponOffersModalProps) {
  const [inputCode, setInputCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'coupons' | 'offers'>('all');

  // Separate coupons vs store offers
  const { couponList, offerList } = useMemo(() => {
    const coupons: OfferItem[] = [];
    const deals: OfferItem[] = [];

    offers.forEach((item) => {
      // If requires coupon code or has a couponCode
      if (item.requiresCoupon || item.couponCode) {
        coupons.push(item);
      } else {
        deals.push(item);
      }
    });

    return { couponList: coupons, offerList: deals };
  }, [offers]);

  const filteredList = useMemo(() => {
    if (selectedTab === 'coupons') return couponList;
    if (selectedTab === 'offers') return offerList;
    return [...couponList, ...offerList];
  }, [selectedTab, couponList, offerList]);

  const handleApplyInputCode = async () => {
    if (!inputCode.trim()) return;
    setLoadingCode(true);
    setErrorMessage(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await onApplyCoupon(inputCode.trim().toUpperCase());
      if (res !== false) {
        setInputCode('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      } else {
        setErrorMessage('Invalid or inapplicable coupon code');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to apply coupon');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleApplyItem = async (item: OfferItem) => {
    if (loadingOfferId) return;
    setLoadingOfferId(item._id);
    setErrorMessage(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (item.couponCode || item.requiresCoupon) {
        const codeToApply = item.couponCode || item.title;
        const res = await onApplyCoupon(codeToApply);
        if (res !== false) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onClose();
        }
      } else {
        await onApplyOffer(item);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to apply offer');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoadingOfferId(null);
    }
  };

  const handleRemoveItem = async (item: OfferItem) => {
    if (loadingOfferId) return;
    setLoadingOfferId(item._id);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if ((item.couponCode && item.couponCode === appliedCouponCode) || item.requiresCoupon) {
        if (onRemoveCoupon) await onRemoveCoupon();
      } else if (onRemoveOffer) {
        await onRemoveOffer(item._id);
      }
    } catch (err) {
      console.error('Error removing offer/coupon:', err);
    } finally {
      setLoadingOfferId(null);
    }
  };

  const isItemApplied = (item: OfferItem) => {
    if (appliedCouponCode && item.couponCode && item.couponCode.toUpperCase() === appliedCouponCode.toUpperCase()) {
      return true;
    }
    return appliedOffers.some(
      (o: any) => (o._id?.toString() || o.offerId?.toString()) === item._id.toString()
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          {/* Handle bar */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="ticket-percent" size={22} color={themeColor} />
                <Text style={styles.headerTitle}>Coupons & Offers</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Apply best discount for your order {cartTotal > 0 ? `(Cart: ₹${cartTotal})` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Coupon Input Row */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="pricetag-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="Enter coupon code"
                placeholderTextColor="#94A3B8"
                value={inputCode}
                onChangeText={(t) => {
                  setInputCode(t.toUpperCase());
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {inputCode.length > 0 && (
                <TouchableOpacity onPress={() => setInputCode('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.applyInputBtn,
                { backgroundColor: inputCode.trim() ? themeColor : '#E2E8F0' },
              ]}
              onPress={handleApplyInputCode}
              disabled={!inputCode.trim() || loadingCode}
            >
              {loadingCode ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.applyInputBtnText,
                    { color: inputCode.trim() ? '#fff' : '#94A3B8' },
                  ]}
                >
                  APPLY
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error message */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Filter Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, selectedTab === 'all' && [styles.activeTabBtn, { borderColor: themeColor, backgroundColor: themeColor + '10' }]]}
              onPress={() => setSelectedTab('all')}
            >
              <Text style={[styles.tabText, selectedTab === 'all' && [styles.activeTabText, { color: themeColor }]]}>
                All ({offers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, selectedTab === 'coupons' && [styles.activeTabBtn, { borderColor: themeColor, backgroundColor: themeColor + '10' }]]}
              onPress={() => setSelectedTab('coupons')}
            >
              <Text style={[styles.tabText, selectedTab === 'coupons' && [styles.activeTabText, { color: themeColor }]]}>
                🎟️ Coupons ({couponList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, selectedTab === 'offers' && [styles.activeTabBtn, { borderColor: themeColor, backgroundColor: themeColor + '10' }]]}
              onPress={() => setSelectedTab('offers')}
            >
              <Text style={[styles.tabText, selectedTab === 'offers' && [styles.activeTabText, { color: themeColor }]]}>
                🏷️ Store Offers ({offerList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Offers / Coupons Scrollable List */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="ticket-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyStateTitle}>No offers available in this category</Text>
                <Text style={styles.emptyStateSub}>You can still enter a valid promo code above.</Text>
              </View>
            ) : (
              filteredList.map((item) => {
                const isApplied = isItemApplied(item);
                const isThisLoading = loadingOfferId === item._id;
                const isCoupon = !!(item.requiresCoupon || item.couponCode);

                const minCartValue = item.conditions?.minCartValue || 0;
                const minOrderValue = item.conditions?.minOrderValue || 0;
                const threshold = Math.max(minCartValue, minOrderValue);
                const showTryAndBuyWarning = orderType === 'try_and_buy' && threshold > 0;

                return (
                  <View key={item._id} style={styles.cardWrapper}>
                    <View
                      style={[
                        styles.offerCard,
                        isCoupon ? styles.couponBorder : styles.dealBorder,
                        isApplied && { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
                        showTryAndBuyWarning && styles.cardNoBottomRadius,
                      ]}
                    >
                      {/* Left Badge Indicator */}
                      <View style={styles.cardHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={[
                              styles.categoryBadge,
                              isCoupon
                                ? { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }
                                : { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                isCoupon ? { color: '#6D28D9' } : { color: '#B45309' },
                              ]}
                            >
                              {isCoupon ? '🎟️ COUPON CODE' : '🏷️ STORE OFFER'}
                            </Text>
                          </View>

                          {isApplied && (
                            <View style={styles.appliedPill}>
                              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                              <Text style={styles.appliedPillText}>
                                {isCoupon ? 'APPLIED' : 'AUTO-APPLIED'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Save amount pill */}
                        {!!item.discountAmount && (
                          <Text style={styles.savingsTag}>Save ₹{item.discountAmount}</Text>
                        )}
                      </View>

                      {/* Main Card Body */}
                      <View style={styles.cardMain}>
                        <View style={styles.cardLeft}>
                          {isCoupon && item.couponCode ? (
                            <View style={styles.dashedCodeBox}>
                              <Text style={[styles.codeText, { color: themeColor }]}>
                                {item.couponCode}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.offerTitle}>{item.title}</Text>
                          )}

                          <Text style={styles.offerDesc} numberOfLines={2}>
                            {item.description || (item.discountValue ? `Get ${item.discountValue}${item.discountType === 'percentage' ? '%' : '₹'} off` : 'Special discount on your order')}
                          </Text>

                          {threshold > 0 && (
                            <Text style={styles.thresholdText}>
                              • Applicable on orders above ₹{threshold}
                            </Text>
                          )}
                        </View>

                        {/* Action Button */}
                        <View style={styles.cardRight}>
                          {isApplied ? (
                            <TouchableOpacity
                              style={styles.removeBtn}
                              onPress={() => handleRemoveItem(item)}
                              disabled={isThisLoading}
                            >
                              {isThisLoading ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                              ) : (
                                <Text style={styles.removeBtnText}>Remove</Text>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.applyCardBtn, { backgroundColor: themeColor }]}
                              onPress={() => handleApplyItem(item)}
                              disabled={isThisLoading}
                            >
                              {isThisLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.applyCardBtnText}>APPLY</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Try & Buy Warning Banner */}
                    {showTryAndBuyWarning && (
                      <View style={styles.tryNotice}>
                        <Ionicons name="information-circle" size={14} color="#B45309" />
                        <Text style={styles.tryNoticeText}>
                          Try & Buy: Must keep items worth at least ₹{threshold} after trial.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.82,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  applyInputBtn: {
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
  },
  applyInputBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#DC2626',
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTabBtn: {
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#64748B',
  },
  activeTabText: {
    fontFamily: Typography.fontFamily.bold,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  cardWrapper: {
    marginBottom: 4,
  },
  offerCard: {
    backgroundColor: '#FAFAFC',
    borderRadius: 16,
    padding: 14,
  },
  couponBorder: {
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  dealBorder: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  cardNoBottomRadius: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  appliedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  appliedPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#16A34A',
  },
  savingsTag: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#10B981',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLeft: {
    flex: 1,
  },
  dashedCodeBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 1,
  },
  offerTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  offerDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    lineHeight: 16,
  },
  thresholdText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    marginTop: 4,
  },
  cardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  applyCardBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  applyCardBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    minWidth: 70,
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#EF4444',
  },
  tryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderStyle: 'dashed',
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tryNoticeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#92400E',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#64748B',
    marginTop: 10,
  },
  emptyStateSub: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    marginTop: 4,
  },
});
