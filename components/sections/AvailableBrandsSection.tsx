import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { useAddress } from '@/context/AddressContext';
import { fetchCourierProducts } from '@/api/products';
import { GenderThemes, Typography } from '@/constants/theme';

interface Merchant {
  _id: string;
  shopName: string;
  logo?: {
    url: string;
  };
  isWarehouse?: boolean;
}

interface AvailableBrandsSectionProps {
  initialMerchants?: Merchant[];
  refreshKey?: number;
  hideExploreLink?: boolean;
  sectionTitle?: string;
  sectionSubtitle?: string;
}

export default function AvailableBrandsSection({ 
  initialMerchants, 
  refreshKey = 0,
  hideExploreLink = false,
  sectionTitle = "Brands Available",
  sectionSubtitle = "Verified partner brands in your zone"
}: AvailableBrandsSectionProps) {
  const router = useRouter();
  const { selectedGender, selectedSubGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const isWarehouseEntity = (item: any) => {
    if (!item) return true;
    if (item.isWarehouse) return true;
    const name = (item.shopName || item.name || '').toLowerCase();
    return name.includes('warehouse') || name.includes('ff kaloor') || name.includes('flashfits hub');
  };

  const [merchants, setMerchants] = useState<Merchant[]>(
    (initialMerchants || []).filter((m) => !isWarehouseEntity(m))
  );
  const [loading, setLoading] = useState(!initialMerchants);

  useEffect(() => {
    // Only fetch automatically if this component is NOT controlled by initialMerchants
    if (initialMerchants === undefined) {
      loadCourierMerchants();
    }
  }, [refreshKey, selectedGender, selectedSubGender, selectedAddress, userLocation]);

  useEffect(() => {
    if (initialMerchants) {
      setMerchants(initialMerchants.filter((m) => !isWarehouseEntity(m)));
    }
  }, [initialMerchants]);

  const loadCourierMerchants = async () => {
    try {
      if (!initialMerchants) setLoading(true);
      
      const apiGender = selectedGender === 'Kids' && selectedSubGender !== 'All'
        ? selectedSubGender.toUpperCase()
        : (selectedGender === 'Kids' ? 'KIDS' : selectedGender.toUpperCase());
      
      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

      const data = await fetchCourierProducts(apiGender, 1, lat, lng);
      const list = data?.merchants || [];
      setMerchants(list.filter((m: any) => !isWarehouseEntity(m)));
    } catch (error) {
      console.error('Error loading courier merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = useCallback(({ item }: { item: Merchant }) => {
    const hasLogo = !!item.logo?.url;
    const initial = (item.shopName || 'B').charAt(0).toUpperCase();

    return (
      <TouchableOpacity 
        style={styles.merchantItem}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: '/merchant/[id]',
            params: { id: item._id, isWarehouse: item.isWarehouse ? 'true' : 'false' }
          } as any);
        }}
      >
        {/* Outer Glow & Gradient Ring */}
        <LinearGradient
          colors={['#38BDF8', '#818CF8', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGradientRing}
        >
          <View style={styles.merchantLogoContainer}>
            {hasLogo ? (
              <Image 
                source={{ uri: item.logo?.url }} 
                style={styles.merchantLogo} 
                contentFit="contain"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.fallbackAvatar}
              >
                <Text style={styles.fallbackText}>{initial}</Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>

        {/* Verified Badge Overlay */}
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={15} color="#10B981" />
        </View>

        <Text style={styles.merchantName} numberOfLines={1}>
          {item.shopName}
        </Text>
      </TouchableOpacity>
    );
  }, [router]);

  if (loading && !initialMerchants) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (merchants.length === 0) return null;

  return (
    <View style={styles.merchantsSection}>
      {/* Premium Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeftRow}>
          <View style={[styles.headerIconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="sparkles" size={16} color={theme.primary || '#4F46E5'} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            <Text style={styles.sectionSubtitle}>{sectionSubtitle}</Text>
          </View>
        </View>

        {!hideExploreLink && (
          <TouchableOpacity 
            style={styles.explorePill}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/explore');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.explorePillText, { color: theme.primary || '#4F46E5' }]}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.primary || '#4F46E5'} />
          </TouchableOpacity>
        )}
      </View>

      <FlashList
        data={merchants}
        horizontal
        estimatedItemSize={96}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={styles.merchantsList}
        renderItem={renderItem as any}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  merchantsSection: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
    marginTop: 1,
  },
  explorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  explorePillText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
  merchantsList: {
    paddingHorizontal: 16,
  },
  merchantItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 76,
    position: 'relative',
  },
  logoGradientRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  merchantLogoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  merchantLogo: {
    width: '68%',
    height: '68%',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 22,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  merchantName: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
    textAlign: 'center',
    width: '100%',
    marginTop: 8,
  },
});
