import MainHeader from '@/components/layout/MainHeader';
import MerchantLogosSection from '@/components/sections/MerchantLogosSection';
import NewArrivalsSection from '@/components/sections/NewArrivalsSection';
import RecentlyViewedSection from '@/components/sections/RecentlyViewedSection';
import SubCategorySection from '@/components/sections/SubCategorySection';
import ProductHorizontalSection from '@/components/sections/ProductHorizontalSection';
import TryComingSoonSection from '@/components/sections/TryComingSoonSection';
import TryOfflineSection from '@/components/sections/TryOfflineSection';
import OfferBanner from '@/components/sections/OfferBanner';
import PromotionalCarousel from '@/components/sections/PromotionalCarousel';
import { fetchMerchants } from '@/api/merchants';
import { useAuth } from '@/context/AuthContext';
import { useAddress } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';
import { fetchCollectionsHome } from '@/api/collections';
import { fetchBanners, fetchRecommendedProductsData, fetchTrendingProductsData, fetchnewArrivalsProductsData } from '@/api/products';
import { Product } from '@/utils/recentlyViewed';
import { Typography } from '@/constants/theme';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  Dimensions,
} from 'react-native';
import Skeleton from '@/components/common/Skeleton';
import logo from '@/assets/images/logo/logo.png';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress, tbAvailable, tbOffline } = useAddress();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [newArrivalsProducts, setNewArrivalsProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [banners, setBanners] = useState<any>({});
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const genderMap: Record<string, string> = { Men: 'MEN', Women: 'WOMEN', Kids: 'KIDS', All: 'MEN' };
      const apiGender = genderMap[selectedGender] || 'MEN';

      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

      const [trending, recommended, newArrivals, bannerData, merchantsResponse, collectionData] = await Promise.all([
        fetchTrendingProductsData(apiGender, lat, lng),
        fetchRecommendedProductsData(apiGender, lat, lng),
        fetchnewArrivalsProductsData(apiGender, lat, lng),
        fetchBanners(),
        fetchMerchants(lat, lng, selectedGender, true),
        fetchCollectionsHome(apiGender, lat, lng)
      ]);

      

      setTrendingProducts(trending || []);
      setRecommendedProducts(recommended || []);
      setNewArrivalsProducts(newArrivals || []);
      setCollections(collectionData || []);
      setMerchants(merchantsResponse?.merchants || merchantsResponse?.data?.merchants || []);
      setBanners(bannerData?.banners || bannerData || {});
    } catch (error: any) {
      if (!error?.isAuthError) {
        console.error('Error loading home data:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedGender, userLocation, selectedAddress]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Derived state for readability
  const isServiceAvailable = tbAvailable !== false;

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    await loadData();
    setRefreshing(false);
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  return (
    <View style={styles.container}>
      <MainHeader scrollY={scrollY} onHeaderLayout={setHeaderHeight} refreshKey={refreshKey} />

      <CustomRefreshControl
        scrollY={scrollY}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        {headerHeight > 0 && <View style={{ height: headerHeight }} />}
        
        {tbAvailable === null ? (
          // ── Loading Availability ──
          <View style={{ padding: 20 }}>
            <Skeleton width="100%" height={200} borderRadius={20} style={{ marginBottom: 24 }} />
            <Skeleton width="60%" height={24} borderRadius={10} style={{ marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Skeleton width={width * 0.4} height={200} borderRadius={16} />
              <Skeleton width={width * 0.4} height={200} borderRadius={16} />
            </View>
          </View>
        ) : tbAvailable === false ? (
          // ── Service Not Available or Offline ──
          tbOffline ? <TryOfflineSection /> : <TryComingSoonSection />
        ) : (
          // ── Service Available ──
          <>
            <PromotionalCarousel />
            <MerchantLogosSection refreshKey={refreshKey} initialMerchants={merchants} />
            <OfferBanner />
            
            {/* Render Remote Collections */}
            {collections.map((coll, idx) => (
              <ProductHorizontalSection
                key={coll._id || idx}
                title={coll.name}
                subtitle={coll.description || 'Special curated list'}
                products={coll.products}
                isLoading={loading}
                banner={coll.banner}
                collectionId={coll._id}
              />
            ))}

            <RecentlyViewedSection refreshKey={refreshKey} />

            <ProductHorizontalSection
              title="New Arrivals"
              subtitle="Fresh styles just for you"
              products={newArrivalsProducts}
              isLoading={loading}
              banner={banners['new_arrivals_banner']?.[0]}
            />

            <ProductHorizontalSection
              title="Trending Now"
              subtitle="Top picks for you"
              products={trendingProducts}
              isLoading={loading}
              banner={banners['trending_banner']?.[0]}
            />

            <ProductHorizontalSection
              title="You May Like"
              subtitle="Curated collection"
              products={recommendedProducts}
              isLoading={loading}
              banner={banners['recommended_banner']?.[0]}
            />

            <View style={{ padding: 20 }}>
              <View style={styles.footer}>
                <Image source={logo} style={styles.footerLogo} resizeMode="contain" />
                <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
                <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  versionText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2.5,
    marginTop: 4,
  },
  taglineText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#d1d5db',
    letterSpacing: 2.5,
    marginTop: 4,
    opacity: 0.6,
    textShadowColor: 'rgba(209, 213, 219, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  footerLogo: {
    width: 140,
    height: 60,
    opacity: 0.25,
  },
});
