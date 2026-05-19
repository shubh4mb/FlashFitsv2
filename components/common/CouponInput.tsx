import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useOffers } from '../../context/OffersContext';
import { useCart } from '../../context/CartContext';
import { useCourierCart } from '../../context/CourierCartContext';

interface CouponInputProps {
  cartContext: any;
  themeColor?: string;
  orderType?: 'try_and_buy' | 'courier';
  appliedOffersData?: any;
}

/**
 * CouponInput — Coupon code input with apply/remove,
 * showing applied offer details and stacked discounts.
 */
export default function CouponInput({ cartContext, themeColor = '#0F172A', orderType, appliedOffersData }: CouponInputProps) {
  const { refreshCart, applyOffer } = useCart();
  const { refreshCart: refreshCourierCart, applyOfferCourier } = useCourierCart();

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
  const [localLoadingOfferId, setLocalLoadingOfferId] = useState<string | null>(null);

  const cartContextString = JSON.stringify(cartContext);

  useEffect(() => {
    if (couponCode) {
      computeBestOffers(cartContext, couponCode);
    }
  }, [couponCode, cartContextString, computeBestOffers]);

  const handleApply = async () => {
    if (!inputCode.trim()) return;
    const success = await applyCoupon(inputCode.trim(), cartContext, orderType);
    if (success) {
      setInputCode('');
      try {
        await Promise.all([refreshCart(), refreshCourierCart()]);
      } catch (err) {
        console.error('Failed to refresh carts after applying coupon:', err);
      }
    }
  };

  const handleApplyOffer = async (offer: any) => {
    if (localLoadingOfferId) return;
    setLocalLoadingOfferId(offer._id);
    try {
      if (offer.requiresCoupon && offer.couponCode) {
        const success = await applyCoupon(offer.couponCode, cartContext, orderType);
        if (success) {
          await Promise.all([refreshCart(), refreshCourierCart()]);
        }
      } else {
        if (orderType === 'try_and_buy') {
          await applyOffer(offer._id);
          await refreshCart();
        } else {
          await applyOfferCourier(offer._id);
          await refreshCourierCart();
        }
      }
    } catch (err) {
      console.error('Failed to apply offer:', err);
    } finally {
      setLocalLoadingOfferId(null);
    }
  };

  // 1. Get current merchantId (if Try & Buy)
  const merchantId = orderType === 'try_and_buy'
    ? Object.keys(cartContext?.merchantTotals || {})[0]
    : undefined;

  // 2. Filter global offers that match the scope and order type, and require a coupon code
  const couponOffers = offers.filter(offer => {
    if (!offer.couponCode) return false;
    
    // Check scope
    if (offer.scope === 'merchant') {
      const offerMid = offer.merchantId?.toString() || (offer.merchantId as any)?._id?.toString();
      if (!offerMid || offerMid !== merchantId) {
        return false;
      }
    }
    
    // Check order type applicability
    if (offer.applicableTo && offer.applicableTo !== 'both') {
      if (offer.applicableTo !== orderType) {
        return false;
      }
    }
    
    return true;
  });

  // 3. Combine with appliedOffersData.availableOffers
  const backendAvailableOffers = appliedOffersData?.availableOffers || [];
  
  const allOffersMap = new Map<string, any>();
  
  // Add global coupon offers
  couponOffers.forEach(o => {
    allOffersMap.set(o._id.toString(), o);
  });
  
  // Add/overwrite backend available offers
  backendAvailableOffers.forEach((o: any) => {
    allOffersMap.set(o._id.toString(), o);
  });
  
  // Convert to array
  const combinedOffers = Array.from(allOffersMap.values());

  // 4. Filter out any offers that are already applied
  const applicableOffers = combinedOffers.filter(offer => {
    const isApplied = appliedOffersData?.appliedOffers?.some(
      (o: any) => (o._id?.toString() || o.offerId?.toString()) === offer._id.toString()
    );
    return !isApplied;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="pricetags" size={16} color={themeColor} />
        <Text style={styles.headerTitle}>Coupons & Offers</Text>
      </View>

      {/* Coupon Input - Always shown */}
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="ticket-outline" size={16} color="#94A3B8" />
          <TextInput
            style={styles.input}
            placeholder="Enter coupon code"
            placeholderTextColor="#94A3B8"
            value={inputCode}
            onChangeText={(text) => {
              setInputCode(text.toUpperCase());
            }}
            autoCapitalize="characters"
            editable={!couponLoading}
          />
        </View>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: inputCode.trim() ? themeColor : '#E2E8F0' }]}
          onPress={handleApply}
          disabled={!inputCode.trim() || couponLoading}
        >
          {couponLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.applyText, { color: inputCode.trim() ? '#fff' : '#94A3B8' }]}>
              Apply
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error */}
      {couponError && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{couponError}</Text>
        </View>
      )}

      {/* Applicable Offers List */}
      {applicableOffers.length > 0 && (
        <View style={styles.offersList}>
          {applicableOffers.map((offer) => {
            const isOfferLoading = localLoadingOfferId === offer._id;
            return (
              <View key={offer._id} style={styles.offerCard}>
                <View style={styles.offerCardLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: themeColor + '12' }]}>
                    <MaterialCommunityIcons name="ticket-percent" size={20} color={themeColor} />
                  </View>
                  <View style={styles.offerDetails}>
                    <View style={styles.codeRow}>
                      <View style={[styles.codeBadge, { borderColor: themeColor + '30', backgroundColor: themeColor + '08' }]}>
                        <Text style={[styles.codeText, { color: themeColor }]}>
                          {offer.couponCode || offer.title}
                        </Text>
                      </View>
                      {!!offer.discountAmount && (
                        <Text style={[styles.saveTag, { color: '#10B981' }]}>
                          Save ₹{offer.discountAmount}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.offerDescription} numberOfLines={2}>
                      {offer.description || `Get discount on your order`}
                    </Text>
                  </View>
                </View>

                <View style={styles.offerCardRight}>
                  <TouchableOpacity
                    onPress={() => handleApplyOffer(offer)}
                    activeOpacity={0.7}
                    style={[styles.actionBtn, { backgroundColor: themeColor }]}
                    disabled={isOfferLoading}
                  >
                    {isOfferLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.applyBtnText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  appliedSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  appliedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  appliedDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appliedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  appliedDiscount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  removeBtn: {
    padding: 2,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
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
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: 1,
  },
  applyBtn: {
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '800',
  },
  couponBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  couponBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  couponBadgeCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  couponBadgeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#16A34A',
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
  },
  offersList: {
    marginTop: 4,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 12,
    marginTop: 10,
  },
  offerCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  offerDetails: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  codeBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  saveTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  offerDescription: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 14,
    fontWeight: '600',
  },
  offerCardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  applyBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
