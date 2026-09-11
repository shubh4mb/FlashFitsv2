import { fetchHomeFeedData } from '@/api/home';
import logo from '@/assets/images/logo/logo.png';
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
import TryOfflineSection from '@/components/sections/TryOfflineSection';
import TryGuaranteeBanner from '@/components/sections/TryGuaranteeBanner';
import { Typography } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
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

  const targetLat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
  const targetLng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
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

          {(!selectedAddress && !userLocation) ? (
            // ── Location / Address Not Chosen Yet ──
            <View style={styles.promptContainer}>
              <View style={styles.promptIconCircle}>
                <Ionicons name="location-outline" size={38} color="#0F172A" />
              </View>
              <Text style={styles.promptTitle}>Where should we deliver?</Text>
              <Text style={styles.promptSubtitle}>
                Select a saved address or enable device location to view trending styles, partner stores, and 60-minute delivery in your area.
              </Text>
              <View style={styles.promptButtonsRow}>
                <TouchableOpacity
                  style={styles.promptPrimaryButton}
                  activeOpacity={0.8}
                  onPress={openAddressModal}
                >
                  <Ionicons name="home-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.promptPrimaryButtonText}>Select Delivery Address</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.promptSecondaryButton}
                  activeOpacity={0.8}
                  onPress={async () => {
                    setEnablingLocation(true);
                    await enableLocation();
                    setEnablingLocation(false);
                  }}
                  disabled={enablingLocation}
                >
                  {enablingLocation ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <>
                      <Ionicons name="flash-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={styles.promptSecondaryButtonText}>Enable Device Location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : loading && tbAvailable === null ? (
            // ── Initial Loading ──
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
            <View>
              {tbOffline ? (
                <TryOfflineSection refreshKey={refreshKey} />
              ) : (
                <TryComingSoonSection />
              )}
            </View>
          ) : (
            // ── Service Available ──
            <>
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
              <View style={{ padding: 20 }}>
                <View style={styles.footer}>
                  <Image source={logo} style={styles.footerLogo} resizeMode="contain" />
                  <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
                  <Text style={styles.versionText}>MADE IN KERALA 🌴</Text>
                </View>
              </View>
            </>
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
});
