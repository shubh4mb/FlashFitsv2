import MainHeader from '@/components/layout/MainHeader';
import ProductCard from '@/components/common/ProductCard';
import { useGender } from '@/context/GenderContext';
import { fetchCourierProducts } from '@/api/products';
import { Typography, GenderThemes } from '@/constants/theme';
import { Product } from '@/utils/recentlyViewed';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import logo from '@/assets/images/logo/logo.png';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';
import { useAddress } from '@/context/AddressContext';
import AvailableBrandsSection from '@/components/sections/AvailableBrandsSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2-column grid with padding

interface Merchant {
  _id: string;
  shopName: string;
  logo: {
    url: string;
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

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadProducts(page + 1, true);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.cardWrapper}>
      <ProductCard 
        product={item} 
        width={CARD_WIDTH} 
        containerStyle={{ marginRight: 0 }} 
        fromExplore={true}
        isNearby={item.isNearby}
        isOnline={item.isOnline}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <MainHeader scrollY={scrollY} onHeaderLayout={setHeaderHeight} refreshKey={refreshKey} />

      <CustomRefreshControl
        scrollY={scrollY}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <Animated.FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id || String(Math.random())}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight || 0 }]}
        columnWrapperStyle={styles.columnWrapper}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
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
                <Text style={styles.infoBannerTitle}>Explore All Shops Collections</Text>
                <Text style={styles.infoBannerSubtitle}>
                  Shop Now • Flat ₹40 delivery 
                </Text>
              </View>
            </View>

            {/* Available Brands Section */}
            <AvailableBrandsSection 
              initialMerchants={merchants} 
              refreshKey={refreshKey} 
              hideExploreLink={true} 
            />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
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
});
