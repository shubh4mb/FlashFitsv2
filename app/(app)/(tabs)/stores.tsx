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
import { Ionicons } from '@expo/vector-icons';
import Loader from '@/components/common/Loader';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { fetchMerchants } from '@/api/merchants';
import { useAddress } from '@/context/AddressContext';
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
}

const MerchantSkeleton = () => (
  <View style={styles.merchantCard}>
    <Skeleton width={COLUMN_WIDTH} height={COLUMN_WIDTH} borderRadius={2} style={{ marginBottom: 8 }} />
    <Skeleton width={COLUMN_WIDTH * 0.8} height={10} borderRadius={2} style={{ alignSelf: 'center' }} />
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
  const [instantTry, setInstantTry] = useState(false);
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
          <Text style={styles.title}>{instantTry ? 'Premium Fast Stores' : 'All Stores'}</Text>
          
          <View style={styles.grid}>
            {loading && !refreshing ? (
              // Show skeletons during gender change or refresh
              Array(12).fill(0).map((_, i) => <MerchantSkeleton key={i} />)
            ) : (
              filteredMerchants.map((merchant) => (
                <TouchableOpacity 
                  key={merchant._id} 
                  style={styles.merchantCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/merchant/[id]', params: { id: merchant._id } } as any);
                  }}
                >
                  <View style={styles.logoContainer}>
                    <Image
                      source={{ uri: merchant.logo.url }}
                      style={styles.logo}
                      contentFit="contain"
                      transition={300}
                    />
                    {merchant.isOnline && (
                      <View style={styles.onlineDot} />
                    )}
                    {merchant.isNearby && (
                      <View style={[styles.instantBadge, { backgroundColor: theme.primary }]}>
                        <Ionicons name="flash" size={6} color="#FFF" />
                        <Text style={styles.instantBadgeText}>TRY & BUY</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.merchantInfo}>
                    <Text style={styles.shopName} numberOfLines={1}>
                      {merchant.shopName}
                    </Text>

                  </View>
                </TouchableOpacity>
              ))
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
    justifyContent: 'flex-start',
    gap: 20,
  },
  merchantCard: {
    width: COLUMN_WIDTH,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH, // Make it a perfect square
    borderRadius: 2, // As requested: borderRadius 2 (curved)
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: '65%',
    height: '65%',
  },
  shopName: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
    textAlign: 'center',
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

});
