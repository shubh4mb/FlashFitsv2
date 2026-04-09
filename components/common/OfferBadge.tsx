import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OfferBadgeProps {
  type: string;
  badgeText?: string;
  discountType?: 'flat' | 'percentage';
  discountValue?: number;
  endDate?: string;
  isFlashSale?: boolean;
  compact?: boolean;
}

/**
 * OfferBadge — Shows offer labels on product cards, merchant pages, etc.
 */
export default function OfferBadge({
  type,
  badgeText,
  discountType,
  discountValue,
  endDate,
  isFlashSale,
  compact = false,
}: OfferBadgeProps) {
  const [timeLeft, setTimeLeft] = useState('');

  // Flash sale countdown
  useEffect(() => {
    if (!isFlashSale || !endDate) return;

    const timer = setInterval(() => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Ended');
        clearInterval(timer);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${mins}m ${secs}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [isFlashSale, endDate]);

  // Determine colors and icon based on type
  const config = getConfig(type);

  const displayText = badgeText || getDefaultText(type, discountType, discountValue);

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.compactText, { color: config.color }]}>{displayText}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Ionicons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{displayText}</Text>
      {isFlashSale && timeLeft && (
        <View style={styles.countdown}>
          <Ionicons name="time" size={10} color={config.color} />
          <Text style={[styles.countdownText, { color: config.color }]}>{timeLeft}</Text>
        </View>
      )}
    </View>
  );
}

function getConfig(type: string) {
  switch (type) {
    case 'FLASH_SALE':
      return { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', icon: 'flash' };
    case 'FIRST_TIME_USER':
      return { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A', icon: 'gift' };
    case 'CART_VALUE':
      return { bg: '#FFF7ED', border: '#FED7AA', color: '#EA580C', icon: 'cart' };
    case 'CATEGORY':
      return { bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB', icon: 'pricetag' };
    case 'VENDOR_DISCOUNT':
      return { bg: '#F5F3FF', border: '#DDD6FE', color: '#7C3AED', icon: 'storefront' };
    case 'VENDOR_MIN_ORDER':
      return { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669', icon: 'bicycle' };
    case 'VENDOR_CLEARANCE':
      return { bg: '#FEF9C3', border: '#FDE68A', color: '#CA8A04', icon: 'flame' };
    default:
      return { bg: '#F1F5F9', border: '#E2E8F0', color: '#475569', icon: 'pricetags' };
  }
}

function getDefaultText(type: string, discountType?: string, discountValue?: number) {
  if (!discountType || !discountValue) return 'OFFER';
  const disc = discountType === 'flat' ? `₹${discountValue} OFF` : `${discountValue}% OFF`;
  return disc;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
