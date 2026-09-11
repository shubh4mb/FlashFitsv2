import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  RefreshControl,
  Switch,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';
import CompactStoreCard from '@/components/common/CompactStoreCard';
import { Ionicons } from '@expo/vector-icons';
import Loader from '@/components/common/Loader';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { fetchMerchants } from '@/api/merchants';
import { useAddress, distanceInMeters } from '@/context/AddressContext';
import { LinearGradient } from 'expo-linear-gradient';
import MainHeader from '@/components/layout/MainHeader';
import { GenderThemes, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/common/themed-view';
import Skeleton from '@/components/common/Skeleton';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 100) / 4; // 4 columns with 20px horizontal padding and 20px gap

interface Merchant {
  _id: string;
  shopName: string;
  logo: {
    url: string;
  };
  genderCategory: string[];
  shipsWithinHours: number;
  isOnline: boolean;
  isNearby: boolean;
  isWarehouse?: boolean;
  address?: {
    location?: {
      coordinates: number[]; // [lng, lat]
    };
  };
  backgroundImage?: {
    url: string;
  };
  rating?: number;
  stats?: {
    totalProducts?: number;
  };
}

const MerchantSkeleton = () => (
  <View style={[styles.merchantCard, { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2, paddingBottom: 12 }]}>
    <Skeleton width="100%" height={60} borderRadius={0} />
    <View style={{ padding: 8, paddingTop: 22, position: 'relative' }}>
      <View style={{ position: 'absolute', top: -16, left: 8, width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFF', padding: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
        <Skeleton width="100%" height="100%" borderRadius={6} />
      </View>
      <Skeleton width="70%" height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="50%" height={10} />
    </View>
  </View>
);

export default function StoresScreen() {
  const router = useRouter();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [instantTry, setInstantTry] = useState(true);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  useEffect(() => {
    loadMerchants();
  }, [selectedGender, userLocation, selectedAddress]);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
      
      const response = await fetchMerchants(lat, lng, selectedGender, false);
      const merchantsList = response?.merchants || response?.data?.merchants || [];
      setMerchants(merchantsList);
    } catch (error) {
      console.error('Failed to load merchants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMerchants();
  };

  const filteredMerchants = useMemo(() => {
    return merchants.filter(m => {
      const matchesGender = m.genderCategory && (
        m.genderCategory.includes(selectedGender) || 
        m.genderCategory.includes('Unisex') ||
        m.genderCategory.some(g => g.toUpperCase() === selectedGender.toUpperCase())
      );

      if (instantTry) {
        return matchesGender && m.isOnline && m.isNearby;
      }
      return matchesGender;
    });
  }, [merchants, selectedGender, instantTry]);

  const userLat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
  const userLng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

  const getDistanceStr = (merchant: Merchant) => {
    const mCoords = merchant.address?.location?.coordinates;
    if (!mCoords || !userLat || !userLng) return null;
    const dist = distanceInMeters(userLat, userLng, mCoords[1], mCoords[0]);
    if (dist > 10000) return null; // Only show if under 10 km
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    }
    return `${(dist / 1000).toFixed(1)} km`;
  };

  const topStores = useMemo(() => {
    const nearby = merchants.filter(m => {
      const matchesGender = m.genderCategory && (
        m.genderCategory.includes(selectedGender) || 
        m.genderCategory.includes('Unisex') ||
        m.genderCategory.some(g => g.toUpperCase() === selectedGender.toUpperCase())
      );
      return matchesGender && m.isNearby;
    });
    return nearby.sort((a, b) => {
      const ratingA = a.rating && a.rating > 0 ? a.rating : 4.5;
      const ratingB = b.rating && b.rating > 0 ? b.rating : 4.5;
      return ratingB - ratingA;
    });
  }, [merchants, selectedGender]);

  // Only show full-page loader on initial mount if we have absolutely nothing
  const isInitialLoading = loading && merchants.length === 0 && !refreshing;

  if (isInitialLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Loader size={60} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MainHeader onHeaderLayout={setHeaderHeight} hideCategories={true} />

      <PremiumRefreshWrapper
        scrollY={scrollY}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <Animated.ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
      >
        {headerHeight > 0 && <View style={{ height: headerHeight }} />}

        {/* Top Stores Near You */}
        {topStores.length > 0 && (
          <View style={styles.topStoresSection}>
            <Text style={styles.sectionTitle}>Top Stores Near You</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topStoresList}
            >
              {topStores.map((store) => {
  const distanceStr = getDistanceStr(store);
  return (
    <CompactStoreCard
      key={store._id}
      merchant={store}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/merchant/[id]', params: { id: store._id, isWarehouse: store.isWarehouse ? 'true' : 'false' } } as any);
      }}
      subInfoText={distanceStr}
      subInfoIcon="location-outline"
      containerStyle={{ width: (width - 50) / 2.3, marginRight: 0 }}
    />
  );
              })}
            </ScrollView>
          </View>
        )}
        
        {/* Instant Try Toggle Section */}
        <View style={styles.filterSection}>
          <View style={styles.instantTryContainer}>
            <View style={styles.instantTryLabelContainer}>
              <View style={[styles.flashIconContainer, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="flash" size={16} color={theme.primary} />
              </View>
              <View>
                <Text style={styles.instantTryTitle}>Instant Try</Text>
                <Text style={styles.instantTrySubtitle}>Try & Buy available</Text>
              </View>
            </View>
            <Switch
              value={instantTry}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setInstantTry(value);
              }}
              trackColor={{ false: '#E2E8F0', true: theme.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E2E8F0"
            />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{instantTry ? 'Instant Try Stores' : 'All Stores'}</Text>
          
          <View style={styles.grid}>
            {loading && !refreshing ? (
              // Show skeletons during gender change or refresh
              Array(12).fill(0).map((_, i) => <MerchantSkeleton key={i} />)
            ) : (
              filteredMerchants.map((merchant) => {
                const distanceStr = getDistanceStr(merchant);
                return (
                  <CompactStoreCard
                    key={merchant._id}
                    merchant={merchant}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: '/merchant/[id]', params: { id: merchant._id, isWarehouse: merchant.isWarehouse ? 'true' : 'false' } } as any);
                    }}
                    subInfoText={distanceStr}
                    subInfoIcon="location-outline"
                    containerStyle={styles.merchantCard}
                  />
                );
              })
            )}
          </View>
        </View>
      </Animated.ScrollView>
    </PremiumRefreshWrapper>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  merchantCard: {
    width: '48%',
    marginRight: 0, // Override CompactStoreCard default
    marginBottom: 12,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  instantTryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  instantTryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flashIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instantTryTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  instantTrySubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
    marginTop: 1,
  },
  instantBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
    borderWidth: 1.5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  instantBadgeText: {
    fontSize: 7,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFF',
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E', // Green
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  merchantInfo: {
    alignItems: 'center',
    gap: 4,
  },
  topStoresSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  topStoresList: {
    paddingHorizontal: 20,
    gap: 16,
  },
 topStoreCard: {
  width: width * 0.7,
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#EAEAEA',
  marginBottom: 4,
},
cardCoverContainer: {
  width: '100%',
  height: 88,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#F1F1F1',
},
cardCover: {
  width: '100%',
  height: '100%',
},
cardCoverFallback: {
  backgroundColor: '#1A1A1A',
},
cardStatusPill: {
  position: 'absolute',
  top: 10,
  right: 10,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 9,
  paddingVertical: 4,
  borderRadius: 20,
  backgroundColor: 'rgba(15, 23, 42, 0.75)',
  gap: 5,
},
cardStatusDot: {
  width: 5,
  height: 5,
  borderRadius: 2.5,
},
cardStatusText: {
  fontSize: 9,
  fontFamily: Typography.fontFamily.medium,
  color: '#FFFFFF',
  letterSpacing: 0.3,
},
cardLogoContainer: {
  position: 'absolute',
  top: 64,
  left: 16,
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: '#FFFFFF',
  padding: 2,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#EAEAEA',
  zIndex: 10,
},
cardLogo: {
  width: '100%',
  height: '100%',
  borderRadius: 22,
},
cardDetailsContainer: {
  flex: 1,
  paddingTop: 28,
  paddingHorizontal: 16,
  paddingBottom: 16,
  backgroundColor: '#FFFFFF',
},
cardHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
cardShopName: {
  color: '#0F172A',
  fontSize: 15,
  fontFamily: Typography.fontFamily.bold,
  flex: 1,
  marginRight: 8,
},
cardRatingBox: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
},
cardRatingText: {
  color: '#0F172A',
  fontSize: 12,
  fontFamily: Typography.fontFamily.bold,
},
cardSubInfoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 6,
  gap: 8,
},
cardSubInfoItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
},
cardSubInfoText: {
  color: '#94A3B8',
  fontSize: 11,
  fontFamily: Typography.fontFamily.medium,
},
cardMetricDivider: {
  width: 3,
  height: 3,
  borderRadius: 1.5,
  backgroundColor: '#CBD5E1',
},
cardTagsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 12,
  gap: 6,
},
cardTag: {
  borderWidth: 1,
  borderColor: '#E2E2E2',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
},
cardTagText: {
  color: '#0F172A',
  fontSize: 9.5,
  fontFamily: Typography.fontFamily.medium,
  letterSpacing: 0.2,
},
});
