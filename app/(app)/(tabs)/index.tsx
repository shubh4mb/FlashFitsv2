import MainHeader from '@/components/layout/MainHeader';
import MerchantLogosSection from '@/components/sections/MerchantLogosSection';
import NewArrivalsSection from '@/components/sections/NewArrivalsSection';
import RecentlyViewedSection from '@/components/sections/RecentlyViewedSection';
import SubCategorySection from '@/components/sections/SubCategorySection';
import ProductHorizontalSection from '@/components/sections/ProductHorizontalSection';
import { useAuth } from '@/context/AuthContext';
import { useGender } from '@/context/GenderContext';
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
} from 'react-native';
import logo from '@/assets/images/logo/logo.png';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { selectedGender } = useGender();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [newArrivalsProducts, setNewArrivalsProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const genderMap: Record<string, string> = { Men: 'MEN', Women: 'WOMEN', Kids: 'KIDS', All: 'MEN' };
      const apiGender = genderMap[selectedGender] || 'MEN';

      const [trending, recommended, newArrivals, bannerData] = await Promise.all([
        fetchTrendingProductsData(apiGender),
        fetchRecommendedProductsData(apiGender),
        fetchnewArrivalsProductsData(apiGender),
        fetchBanners(),
      ]);

      setTrendingProducts(trending || []);
      setRecommendedProducts(recommended || []);
      setNewArrivalsProducts(newArrivals || []);
      setBanners(bannerData?.banners || bannerData || {});
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGender]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

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
        {/* <SubCategorySection refreshKey={refreshKey} /> */}
        <MerchantLogosSection refreshKey={refreshKey} />
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


        {/* <GenderHero /> */}

        <View style={{ padding: 20 }}>

          <View style={styles.footer}>
            <Image source={logo} style={styles.footerLogo} resizeMode="contain" />
            <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
            <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

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
