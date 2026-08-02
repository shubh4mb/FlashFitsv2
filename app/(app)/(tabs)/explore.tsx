import { fetchCourierProducts } from '@/api/products';
import logo from '@/assets/images/logo/logo.png';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import ProductCard from '@/components/common/ProductCard';
import CompactStoreCard from '@/components/common/CompactStoreCard';
import MainHeader from '@/components/layout/MainHeader';
import { GenderThemes, Typography } from '@/constants/theme';
import { useAddress, distanceInMeters } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';
import { Product } from '@/utils/recentlyViewed';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 34) / 2; // 2-column grid with reduced padding (12 left + 12 right + 10 gap)

interface Merchant {
  _id: string;
  shopName: string;
  logo: {
    url: string;
  };
  backgroundImage?: {
    url: string;
  };
  isOnline?: boolean;
  rating?: number;
  stats?: {
    totalProducts?: number;
  };
  genderCategory?: string[];
  address?: {
    location?: {
      coordinates: number[]; // [lng, lat]
    };
  };
}

export default function ExploreScreen() {
  const router = useRouter();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const genderMap: Record<string, string> = { Men: 'MEN', Women: 'WOMEN', Kids: 'KIDS', All: 'MEN' };
  const apiGender = genderMap[selectedGender] || 'MEN';

  const getDistanceStr = (merchant: Merchant) => {
    const mCoords = merchant.address?.location?.coordinates;
    const userLat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
    const userLng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
    if (!mCoords || !userLat || !userLng) return null;
    const dist = distanceInMeters(userLat, userLng, mCoords[1], mCoords[0]);
    if (dist > 10000) return null; // Only show if under 10 km
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    }
    return `${(dist / 1000).toFixed(1)} km`;
  };

  const loadProducts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

      const data = await fetchCourierProducts(apiGender, pageNum, lat, lng);
      const fetched = data?.products || [];

      if (append) {
        setProducts(prev => [...prev, ...fetched]);
      } else {
        setProducts(fetched);
        setMerchants(data?.merchants || []);
      }

      setHasMore(pageNum < (data?.totalPages || 1));
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading explore products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [apiGender, selectedAddress, userLocation]);

  useEffect(() => {
    loadProducts(1, false);
  }, [loadProducts, refreshKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    await loadProducts(1, false);
    setRefreshing(false);
  };

  const handleScrollEndDrag = (event: any) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadProducts(page + 1, true);
    }
  };

  const renderProduct = useCallback(({ item, index }: { item: Product; index: number }) => (
    <View style={[styles.cardWrapper, { marginBottom: 16, marginRight: index % 2 === 0 ? 10 : 0 }]}>
      <ProductCard
        product={item}
        width={CARD_WIDTH}
        containerStyle={styles.productCardExplore}
        fromExplore={true}
        isNearby={item.isNearby}
        isOnline={item.isOnline}
      />
    </View>
  ), [CARD_WIDTH]);

  const renderMerchant = useCallback(({ item }: { item: Merchant }) => {
    const distanceStr = getDistanceStr(item);
    return (
      <View key={item._id}>
        <CompactStoreCard
          merchant={item as any}
          onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: item._id, fromExplore: 'true', isWarehouse: (item as any).isWarehouse ? 'true' : 'false' } } as any)}
          subInfoText={distanceStr}
          subInfoIcon="location-outline"
        />
      </View>
    );
  }, [router, selectedAddress, userLocation]);

  return (
    <View style={styles.container}>
      <MainHeader scrollY={scrollY} onHeaderLayout={setHeaderHeight} refreshKey={refreshKey} />

      <PremiumRefreshWrapper
        scrollY={scrollY}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <AnimatedFlashList
          data={products}
          renderItem={renderProduct}
          estimatedItemSize={250}
          keyExtractor={(item: any, index: number) => item._id || String(index)}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingTop: headerHeight || 0 }]}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
          <>
            {/* Courier Info Banner */}
            <View style={styles.infoBanner}>
              <View style={[styles.infoBannerIcon, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="compass-outline" size={28} color={theme.primary} />
              </View>
              <View style={styles.infoBannerText}>
                <Text style={styles.infoBannerTitle}>Explore Collection</Text>
                <Text style={styles.infoBannerSubtitle}>
                  Shop from anywhere • Flat ₹40 delivery • Delivery across Country
                </Text>
              </View>
            </View>

            {/* Available Brands Section */}
            {merchants.length > 0 && (
              <View style={styles.merchantsSection}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Available Stores</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </View>
                <FlashList
                  data={merchants}
                  horizontal
                  estimatedItemSize={150}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item: any) => item._id}
                  contentContainerStyle={styles.merchantsList}
                  renderItem={renderMerchant as any}
                />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>Loading explore products…</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="compass-outline" size={60} color={theme.primary} />
              </View>
              <Text style={styles.emptyTitle}>No items to explore yet</Text>
              <Text style={styles.emptyText}>
                Merchants haven't enabled courier delivery yet. Check back soon!
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <>
            {loadingMore && (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            )}
            {products.length > 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Image source={logo} style={styles.footerLogo} contentFit="contain" />
                <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
                <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
              </View>
            )}
            <View style={{ height: 100 }} />
          </>
        }
      />
    </PremiumRefreshWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  infoBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoBannerText: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  infoBannerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerLogo: {
    width: 140,
    height: 60,
    opacity: 0.25,
  },
  taglineText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2.5,
    marginTop: 4,
    opacity: 0.6,
  },
  versionText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2.5,
    marginTop: 4,
  },
  merchantsSection: {
    marginBottom: 24,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
  },
  merchantsList: {
    paddingRight: 16,
  },
  productCardExplore: {
    marginRight: 0,
  },
});
