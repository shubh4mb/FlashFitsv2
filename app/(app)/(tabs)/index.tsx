import { fetchHomeFeedData } from '@/api/home';
import BrandFooter from '@/components/common/BrandFooter';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import Skeleton from '@/components/common/Skeleton';
import MainHeader from '@/components/layout/MainHeader';
import CampaignHeroSection from '@/components/sections/CampaignHeroSection';
import MerchantLogosSection from '@/components/sections/MerchantLogosSection';
import OfferBanner from '@/components/sections/OfferBanner';
import ProductHorizontalSection from '@/components/sections/ProductHorizontalSection';
import PromotionalCarousel from '@/components/sections/PromotionalCarousel';
import RecentlyViewedSection from '@/components/sections/RecentlyViewedSection';
import TryComingSoonSection from '@/components/sections/TryComingSoonSection';
import KidsComingSoonSection from '@/components/sections/KidsComingSoonSection';
import TryOfflineSection from '@/components/sections/TryOfflineSection';
import TryGuaranteeBanner from '@/components/sections/TryGuaranteeBanner';
import SlimFreeDeliveryBanner from '@/components/common/SlimFreeDeliveryBanner';
import { Typography } from '@/constants/theme';
import { useAddress, DEFAULT_FALLBACK_COORDS } from '@/context/AddressContext';
import { useAuth } from '@/context/AuthContext';
import { useCampaign } from '@/context/CampaignContext';
import { useGender } from '@/context/GenderContext';
import { Product } from '@/utils/recentlyViewed';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { selectedGender, selectedSubGender } = useGender();
  const {
    userLocation,
    selectedAddress,
    tbAvailable,
    tbOffline,
    openAddressModal,
    enableLocation,
    requestInitialLocation,
  } = useAddress();
  const { setCampaignFromCollections } = useCampaign();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [enablingLocation, setEnablingLocation] = useState(false);

  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [newArrivalsProducts, setNewArrivalsProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [banners, setBanners] = useState<any>({});
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const targetLat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude ?? DEFAULT_FALLBACK_COORDS.latitude;
  const targetLng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude ?? DEFAULT_FALLBACK_COORDS.longitude;
  const addressId = selectedAddress?._id;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const apiGender = selectedGender === 'Kids' && selectedSubGender !== 'All'
        ? selectedSubGender.toUpperCase()
        : (selectedGender === 'Kids' ? 'KIDS' : selectedGender.toUpperCase());

      const feedData = await fetchHomeFeedData(apiGender, targetLat, targetLng);

      setTrendingProducts(Array.isArray(feedData?.trending) ? feedData.trending : (feedData?.trending?.products || feedData?.trending?.data || []));
      setRecommendedProducts(Array.isArray(feedData?.recommended) ? feedData.recommended : (feedData?.recommended?.products || feedData?.recommended?.data || []));
      setNewArrivalsProducts(Array.isArray(feedData?.newArrivals) ? feedData.newArrivals : (feedData?.newArrivals?.products || feedData?.newArrivals?.data || []));
      
      const parsedCollections = Array.isArray(feedData?.collections) ? feedData.collections : (feedData?.collections?.collections || feedData?.collections?.data || []);
      setCollections(parsedCollections);
      
      // Feed collections to CampaignContext so it picks the hero campaign
      setCampaignFromCollections(parsedCollections);

      setMerchants(feedData?.merchants?.merchants || feedData?.merchants?.data?.merchants || []);
      setBanners(feedData?.banners?.banners || feedData?.banners || {});
    } catch (error: any) {
      if (!error?.isAuthError) {
        console.error('Error loading home data:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedGender, selectedSubGender, targetLat, targetLng, addressId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  useEffect(() => {
    requestInitialLocation();
  }, [requestInitialLocation]);

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

      <PremiumRefreshWrapper
        scrollY={scrollY}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {headerHeight > 0 && <View style={{ height: headerHeight }} />}

          {selectedGender === 'Kids' ? (
            <View>
              <KidsComingSoonSection tabType="tryAndBuy" onRefresh={onRefresh} refreshing={refreshing} />
              <BrandFooter />
            </View>
          ) : (
            <View>
              {/* Optional non-blocking delivery address pill if not selected */}
              {!selectedAddress && !userLocation && (
                <View style={styles.inlinePromptContainer}>
                  <Ionicons name="location-outline" size={18} color="#0F172A" />
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text style={styles.inlinePromptTitle}>Location not set</Text>
                    <Text style={styles.inlinePromptSubtitle}>Set delivery address for 30-min Try at Home</Text>
                  </View>
                  <TouchableOpacity style={styles.inlinePromptButton} onPress={openAddressModal} activeOpacity={0.8}>
                    <Text style={styles.inlinePromptButtonText}>Set Location</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Optional non-blocking notice pill if out of service area */}
              {tbAvailable === false && (
                <View style={styles.serviceNoticeContainer}>
                  <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.serviceNoticeTitle}>Browsing Catalog</Text>
                    <Text style={styles.serviceNoticeSubtitle}>30-min doorstep try-on is active in select zones. Feel free to browse our full collection!</Text>
                  </View>
                </View>
              )}

              {/* Slim Free Delivery & Referral Banner */}
              <SlimFreeDeliveryBanner style={{ marginTop: 2, marginBottom: 6 }} />

              {/* Promotional Carousel */}
              <PromotionalCarousel />

              {/* ═══ CAMPAIGN HERO (Swiggy-Inspired) ═══ */}
              {/* Only renders when an active campaign exists via CampaignContext */}
              <CampaignHeroSection />

              {/* Verified Partner Stores Near You */}
              <MerchantLogosSection refreshKey={refreshKey} initialMerchants={merchants} />

              {/* Offers & Flash Deals */}
              <OfferBanner />

              {/* Render Remote Collections */}
              {Array.isArray(collections) && collections.map((coll, idx) => (
                <ProductHorizontalSection
                  key={coll._id || idx}
                  title={coll.name ? coll.name.charAt(0).toUpperCase() + coll.name.slice(1) : ''}
                  subtitle={coll.tagline || (coll.description ? coll.description.charAt(0).toUpperCase() + coll.description.slice(1) : 'Special curated list')}
                  products={coll.products || []}
                  isLoading={loading}
                  banner={coll.banner}
                  collectionId={coll._id}
                  slug={coll.slug}
                  campaignType={coll.campaignType}
                  badgeText={coll.badgeText}
                  theme={coll.theme}
                />
              ))}

              {/* Recently Viewed Fits */}
              <RecentlyViewedSection refreshKey={refreshKey} />

              {/* New Arrivals */}
              <ProductHorizontalSection
                title="New Arrivals"
                subtitle="Fresh styles just for you"
                products={newArrivalsProducts}
                isLoading={loading}
                banner={banners['new_arrivals_banner']?.[0]}
                sortBy="newest"
              />

              {/* Trending Now */}
              <ProductHorizontalSection
                title="Trending Now"
                subtitle="Top picks for you"
                products={trendingProducts}
                isLoading={loading}
                banner={banners['trending_banner']?.[0]}
                sortBy="trending"
              />

              {/* Curated Recommendations */}
              <ProductHorizontalSection
                title="You May Like"
                subtitle="Curated collection"
                products={recommendedProducts}
                isLoading={loading}
                banner={banners['recommended_banner']?.[0]}
                sortBy="trending"
              />

              {/* The Try & Buy Promise Card */}
              <TryGuaranteeBanner />

              {/* Brand Footer */}
              <BrandFooter />
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </PremiumRefreshWrapper>
    </View>
  );
}
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  promptContainer: {
    paddingHorizontal: 28,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  promptTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  promptSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  promptButtonsRow: {
    width: '100%',
    gap: 12,
  },
  promptPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 15,
    borderRadius: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  promptPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.2,
  },
  promptSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
  },
  promptSecondaryButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.2,
  },
  inlinePromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inlinePromptTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  inlinePromptSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 1,
  },
  inlinePromptButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inlinePromptButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
  serviceNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  serviceNoticeTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0369A1',
  },
  serviceNoticeSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#0284C7',
    marginTop: 1,
  },
});
