import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOffers } from '../../context/OffersContext';
import { useCart } from '../../context/CartContext';
import { useCourierCart } from '../../context/CourierCartContext';
import CouponOffersModal, { OfferItem } from '../modals/CouponOffersModal';
import { Typography } from '@/constants/theme';

interface CouponInputProps {
  cartContext: any;
  themeColor?: string;
  orderType?: 'try_and_buy' | 'courier';
  appliedOffersData?: any;
  onOffersUpdated?: () => void;
}

/**
 * CouponInput / CouponOffersSection
 * Shows a compact input bar and "View all offers" trigger when unapplied,
 * or ONLY the applied coupons and offers with distinct badges when applied.
 */
export default function CouponInput({
  cartContext,
  themeColor = '#0F172A',
  orderType = 'try_and_buy',
  appliedOffersData,
  onOffersUpdated,
}: CouponInputProps) {
  const { refreshCart, applyOffer, removeOffer } = useCart();
  const { refreshCart: refreshCourierCart, applyOfferCourier, removeOfferCourier } = useCourierCart();

  const {
    offers,
    couponCode,
    couponLoading,
    couponError,
    applyCoupon,
    removeCoupon,
    computeBestOffers,
  } = useOffers();

  const [inputCode, setInputCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const cartContextString = JSON.stringify(cartContext);

  useEffect(() => {
    if (couponCode) {
      computeBestOffers(cartContext, couponCode);
    }
  }, [couponCode, cartContextString, computeBestOffers]);

  // 1. Get current merchantId (if Try & Buy)
  const merchantId = orderType === 'try_and_buy'
    ? Object.keys(cartContext?.merchantTotals || {})[0]
    : undefined;

  // 2. Filter global offers matching scope & order type
  const applicableGlobalOffers = useMemo(() => {
    return offers.filter((offer) => {
      // Scope check
      if (offer.scope === 'merchant') {
        const offerMid = offer.merchantId?.toString() || (offer.merchantId as any)?._id?.toString();
        if (!offerMid || offerMid !== merchantId) {
          return false;
        }
      }

      // Order type check
      if (offer.applicableTo && offer.applicableTo !== 'both') {
        if (offer.applicableTo !== orderType) {
          return false;
        }
      }

      return true;
    });
  }, [offers, merchantId, orderType]);

  // 3. Combine with backend availableOffers
  const backendAvailableOffers = appliedOffersData?.availableOffers || [];

  const combinedOffers: OfferItem[] = useMemo(() => {
    const allMap = new Map<string, OfferItem>();

    applicableGlobalOffers.forEach((o: any) => {
      allMap.set(o._id.toString(), o);
    });

    backendAvailableOffers.forEach((o: any) => {
      allMap.set(o._id.toString(), o);
    });

    return Array.from(allMap.values()).filter((o) => o.reason !== 'You have already used this offer');
  }, [applicableGlobalOffers, backendAvailableOffers]);

  // Applied list
  const appliedList = appliedOffersData?.appliedOffers || [];
  const hasAppliedOffers = appliedList.length > 0 || !!couponCode;
  const totalSavings = (appliedOffersData?.totalDiscount || 0);

  const handleApplyCode = async (codeOverride?: string) => {
    const code = (codeOverride || inputCode).trim().toUpperCase();
    if (!code) return false;

    setLocalLoading(true);
    try {
      const success = await applyCoupon(code, cartContext, orderType);
      if (success) {
        setInputCode('');
        if (orderType === 'try_and_buy') {
          await refreshCart();
        } else {
          await refreshCourierCart();
        }
        if (onOffersUpdated) onOffersUpdated();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to apply coupon:', err);
      return false;
    } finally {
      setLocalLoading(false);
    }
  };

  const handleApplyOfferItem = async (offer: OfferItem) => {
    setLocalLoading(true);
    try {
      if (offer.requiresCoupon && offer.couponCode) {
        return await handleApplyCode(offer.couponCode);
      } else {
        if (orderType === 'try_and_buy') {
          await applyOffer(offer._id);
          await refreshCart();
        } else {
          await applyOfferCourier(offer._id);
          await refreshCourierCart();
        }
        if (onOffersUpdated) onOffersUpdated();
        return true;
      }
    } catch (err) {
      console.error('Failed to apply offer:', err);
      return false;
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRemoveOfferItem = async (offerId: string) => {
    setLocalLoading(true);
    try {
      if (orderType === 'try_and_buy') {
        await removeOffer(offerId);
        await refreshCart();
      } else {
        await removeOfferCourier(offerId);
        await refreshCourierCart();
      }
      if (onOffersUpdated) onOffersUpdated();
    } catch (err) {
      console.error('Failed to remove offer:', err);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRemoveCouponCode = async () => {
    setLocalLoading(true);
    try {
      await removeCoupon();
      if (orderType === 'try_and_buy') {
        await refreshCart();
      } else {
        await refreshCourierCart();
      }
      if (onOffersUpdated) onOffersUpdated();
    } catch (err) {
      console.error('Failed to remove coupon:', err);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── WHEN OFFERS/COUPONS ARE APPLIED: SHOW ONLY APPLIED ITEMS ─── */}
      {hasAppliedOffers ? (
        <View style={styles.appliedCard}>
          <View style={styles.appliedHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="tag-check" size={20} color="#10B981" />
              <Text style={styles.appliedHeaderTitle}>Applied Discounts</Text>
            </View>
            {totalSavings > 0 && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeText}>Saved ₹{totalSavings}</Text>
              </View>
            )}
          </View>

          {/* List of Applied Items */}
          <View style={styles.appliedListContainer}>
            {/* Applied Coupon (if active) */}
            {couponCode && (
              <View style={styles.appliedItemRow}>
                <View style={styles.appliedItemLeft}>
                  <View style={[styles.typeBadge, styles.couponTypeBadge]}>
                    <Text style={styles.couponTypeBadgeText}>🎟️ COUPON</Text>
                  </View>
                  <Text style={styles.appliedCodeText}>{couponCode}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleRemoveCouponCode}
                  style={styles.inlineRemoveBtn}
                  disabled={localLoading || couponLoading}
                >
                  <Text style={styles.inlineRemoveText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Applied Offers / Deals */}
            {appliedList.map((appliedItem: any) => {
              const id = appliedItem._id || appliedItem.offerId;
              const isCouponItem = appliedItem.couponCode || appliedItem.requiresCoupon;
              if (isCouponItem && appliedItem.couponCode === couponCode) {
                // Already rendered above
                return null;
              }

              return (
                <View key={id} style={styles.appliedItemRow}>
                  <View style={styles.appliedItemLeft}>
                    <View
                      style={[
                        styles.typeBadge,
                        isCouponItem ? styles.couponTypeBadge : styles.offerTypeBadge,
                      ]}
                    >
                      <Text
                        style={
                          isCouponItem
                            ? styles.couponTypeBadgeText
                            : styles.offerTypeBadgeText
                        }
                      >
                        {isCouponItem ? '🎟️ COUPON' : '🏷️ STORE OFFER (Auto-applied)'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appliedTitleText} numberOfLines={1}>
                        {appliedItem.title || appliedItem.couponCode}
                      </Text>
                      {!!appliedItem.discountApplied && (
                        <Text style={styles.appliedDiscountSub}>
                          - ₹{appliedItem.discountApplied} off
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      isCouponItem
                        ? handleRemoveCouponCode()
                        : handleRemoveOfferItem(id)
                    }
                    style={styles.inlineRemoveBtn}
                    disabled={localLoading}
                  >
                    <Text style={styles.inlineRemoveText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Change or View Other Offers Button */}
          <TouchableOpacity
            style={styles.changeOffersBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.changeOffersText, { color: themeColor }]}>
              View or change coupons & offers ›
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ─── WHEN NO COUPON/OFFER APPLIED: CLEAN INPUT + VIEW OFFERS POPUP TRIGGER ─── */
        <View style={styles.unappliedSection}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="pricetags" size={16} color={themeColor} />
            <Text style={styles.headerTitle}>Coupons & Offers</Text>
          </View>

          {/* Sleek Input Bar */}
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Ionicons name="ticket-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="Enter coupon code"
                placeholderTextColor="#94A3B8"
                value={inputCode}
                onChangeText={(text) => setInputCode(text.toUpperCase())}
                autoCapitalize="characters"
                editable={!couponLoading && !localLoading}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.applyBtn,
                { backgroundColor: inputCode.trim() ? themeColor : '#E2E8F0' },
              ]}
              onPress={() => handleApplyCode()}
              disabled={!inputCode.trim() || couponLoading || localLoading}
            >
              {couponLoading || localLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.applyText,
                    { color: inputCode.trim() ? '#fff' : '#94A3B8' },
                  ]}
                >
                  Apply
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error Row */}
          {couponError && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{couponError}</Text>
            </View>
          )}

          {/* Pop-up Modal Trigger Banner */}
          <TouchableOpacity
            style={styles.viewOffersTrigger}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.triggerLeft}>
              <View style={[styles.triggerIconCircle, { backgroundColor: themeColor + '12' }]}>
                <MaterialCommunityIcons name="ticket-percent" size={18} color={themeColor} />
              </View>
              <View>
                <Text style={styles.triggerTitle}>View Available Offers & Coupons</Text>
                <Text style={styles.triggerSub}>
                  {combinedOffers.length > 0
                    ? `${combinedOffers.length} offers available to save more`
                    : 'Tap to browse exclusive discounts'}
                </Text>
              </View>
            </View>
            <View style={styles.triggerArrowCircle}>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Pop-up Full Modal */}
      <CouponOffersModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        offers={combinedOffers}
        appliedOffers={appliedList}
        appliedCouponCode={couponCode}
        onApplyCoupon={async (code) => {
          return await handleApplyCode(code);
        }}
        onApplyOffer={async (offer) => {
          return await handleApplyOfferItem(offer);
        }}
        onRemoveOffer={handleRemoveOfferItem}
        onRemoveCoupon={handleRemoveCouponCode}
        themeColor={themeColor}
        orderType={orderType}
        cartTotal={cartContext?.subtotal || 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  unappliedSection: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  applyBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 42,
  },
  applyText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#EF4444',
  },
  viewOffersTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 10,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  triggerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  triggerSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 1,
  },
  triggerArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Applied State Styles
  appliedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
  },
  appliedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    marginBottom: 8,
  },
  appliedHeaderTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#166534',
  },
  savingsBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  appliedListContainer: {
    gap: 8,
  },
  appliedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appliedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  couponTypeBadge: {
    backgroundColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  couponTypeBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#6D28D9',
  },
  offerTypeBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  offerTypeBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#B45309',
  },
  appliedCodeText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  appliedTitleText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  appliedDiscountSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#16A34A',
  },
  inlineRemoveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  inlineRemoveText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#EF4444',
  },
  changeOffersBtn: {
    marginTop: 8,
    paddingTop: 6,
    alignItems: 'center',
  },
  changeOffersText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
  },
});
