import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffers } from '../../context/OffersContext';

interface CouponInputProps {
  cartContext: any;
  themeColor?: string;
}

/**
 * CouponInput — Coupon code input with apply/remove,
 * showing applied offer details and stacked discounts.
 */
export default function CouponInput({ cartContext, themeColor = '#0F172A' }: CouponInputProps) {
  const {
    appliedOffers,
    couponCode,
    couponLoading,
    couponError,
    applyCoupon,
    removeCoupon,
  } = useOffers();

  const [inputCode, setInputCode] = useState('');

  const handleApply = async () => {
    if (!inputCode.trim()) return;
    const success = await applyCoupon(inputCode.trim(), cartContext);
    if (success) setInputCode('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="pricetags" size={16} color={themeColor} />
        <Text style={styles.headerTitle}>Coupons & Offers</Text>
      </View>

      {/* Applied Offers Summary */}
      {appliedOffers && (appliedOffers.totalDiscount > 0 || appliedOffers.freeDelivery) && (
        <View style={styles.appliedSection}>
          {(appliedOffers.appliedOffers || []).map((offer: any, index: number) => {
            const dotColor = offer.scope === 'admin' ? '#16A34A' : '#7C3AED';
            return (
              <View key={offer._id || index} style={styles.appliedRow}>
                <View style={[styles.appliedDot, { backgroundColor: dotColor }]} />
                <View style={styles.appliedDetails}>
                  <Text style={styles.appliedTitle} numberOfLines={1}>
                    {offer.title}
                  </Text>
                  <Text style={styles.appliedDiscount}>
                    -₹{offer.discountAmount}
                  </Text>
                </View>
                {offer.couponCode && (
                  <TouchableOpacity onPress={removeCoupon} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <View style={styles.savingsRow}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={styles.savingsText}>
              {appliedOffers.totalDiscount > 0 ? `You save ₹${appliedOffers.totalDiscount} on this order` : ''}
              {appliedOffers.totalDiscount > 0 && appliedOffers.freeDelivery ? ' + ' : ''}
              {appliedOffers.freeDelivery ? 'Free Delivery Applied' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Coupon Input */}
      {!couponCode && (
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
                if (couponError) {
                  // Clear error when user types
                }
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
      )}

      {/* Applied Coupon Badge */}
      {couponCode && (
        <View style={styles.couponBadge}>
          <View style={styles.couponBadgeLeft}>
            <Ionicons name="ticket" size={14} color="#16A34A" />
            <Text style={styles.couponBadgeCode}>{couponCode}</Text>
            <Text style={styles.couponBadgeLabel}>applied</Text>
          </View>
          <TouchableOpacity onPress={removeCoupon}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {couponError && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{couponError}</Text>
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
});
