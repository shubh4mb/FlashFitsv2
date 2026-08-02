import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/constants/theme';

export interface CompactStoreCardMerchant {
  _id: string;
  shopName: string;
  logo: {
    url: string;
  };
  backgroundImage?: {
    url: string;
  };
  isOnline?: boolean;
  isWarehouse?: boolean;
  rating?: number;
  stats?: {
    totalProducts?: number;
  };
}

interface CompactStoreCardProps {
  merchant: CompactStoreCardMerchant;
  onPress: () => void;
  subInfoText?: string | null;
  subInfoIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: object;
}

export default function CompactStoreCard({
  merchant,
  onPress,
  subInfoText,
  subInfoIcon = 'location-outline',
  containerStyle,
}: CompactStoreCardProps) {
  const ratingVal = merchant.rating && merchant.rating > 0 ? merchant.rating.toFixed(1) : '4.9';
  const hasSubInfo = !!subInfoText;
  const hasProducts = !!merchant.stats?.totalProducts;
  const isWh = merchant.isWarehouse || merchant._id === 'ff-warehouse-hub';

  return (
    <TouchableOpacity
      style={[styles.compactCard, containerStyle]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Banner / Cover */}
      <View style={styles.compactBannerContainer}>
        {merchant.backgroundImage?.url ? (
          <Image
            source={{ uri: merchant.backgroundImage.url }}
            style={styles.compactBanner}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.compactBanner, { backgroundColor: isWh ? '#0F172A' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
            {isWh && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="flash" size={14} color="#38BDF8" />
                <Text style={{ fontSize: 9, fontFamily: Typography.fontFamily.bold, color: '#38BDF8', letterSpacing: 1 }}>FF HUB</Text>
              </View>
            )}
          </View>
        )}
        {(merchant.isOnline || isWh) && (
          <View style={[styles.onlinePill, isWh && { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
            <View style={[styles.onlineDot, isWh && { backgroundColor: '#38BDF8' }]} />
            <Text style={[styles.onlineText, isWh && { color: '#38BDF8' }]}>{isWh ? 'Warehouse' : 'Online'}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.compactInfo}>
        {/* Overlapping Logo */}
        <View style={[styles.compactLogoContainer, isWh && { backgroundColor: '#0F172A', borderColor: '#38BDF8' }]}>
          {merchant.logo?.url ? (
            <Image
              source={{ uri: merchant.logo.url }}
              style={styles.compactLogo}
              contentFit="contain"
            />
          ) : (
            <Ionicons name="flash" size={18} color={isWh ? '#38BDF8' : '#0F172A'} />
          )}
        </View>
        
        <View style={styles.compactNameRow}>
          <Text style={styles.compactName} numberOfLines={1}>
            {merchant.shopName}
          </Text>
          <View style={styles.compactRating}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={styles.compactRatingText}>{ratingVal}</Text>
          </View>
        </View>
        
        <View style={styles.compactDistanceRow}>
          {hasSubInfo && (
            <View style={styles.compactSubInfoItem}>
              <Ionicons name={subInfoIcon} size={12} color="#94A3B8" />
              <Text style={styles.compactDistanceText}>
                {subInfoText}
              </Text>
            </View>
          )}

          {hasProducts && (
            <>
              {hasSubInfo && <View style={styles.cardMetricDivider} />}
              <View style={styles.compactSubInfoItem}>
                <Ionicons name="cube-outline" size={12} color="#94A3B8" />
                <Text style={styles.compactDistanceText}>
                  {merchant.stats?.totalProducts} Items
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  compactBannerContainer: {
    width: '100%',
    height: 60,
    position: 'relative',
  },
  compactBanner: {
    width: '100%',
    height: '100%',
  },
  onlinePill: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  onlineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.medium,
    color: '#FFF',
  },
  compactInfo: {
    padding: 8,
    paddingTop: 22,
    position: 'relative',
  },
  compactLogoContainer: {
    position: 'absolute',
    top: -16,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  compactLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  compactNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactName: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactRatingText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#D97706',
  },
  compactDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compactSubInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactDistanceText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  cardMetricDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
});
