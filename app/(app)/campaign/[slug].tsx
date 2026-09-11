import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  Platform,
  Clipboard
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchCollectionDetails } from '@/api/collections';
import { useAddress } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';
import { GenderThemes, Typography } from '@/constants/theme';
import ProductCard from '@/components/common/ProductCard';
import Skeleton from '@/components/common/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 44) / 2;

type SortOption = 'relevance' | 'price_low' | 'price_high' | 'newest' | 'trending';

export default function CampaignScreen() {
  const { slug, title: initialTitle, subCurationId: initialSubCuration } = useLocalSearchParams<{ slug: string; title?: string; subCurationId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [campaign, setCampaign] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState(initialSubCuration || 'all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  // Time remaining countdown calculation
  const [timeLeft, setTimeLeft] = useState<string>('');

  const loadCampaignData = useCallback(async (isRefresh = false, pageNum = 1, subTab = activeSubTab, sort = sortBy) => {
    if (!slug) return;
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);

      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

      const res = await fetchCollectionDetails(slug, {
        subCurationId: subTab !== 'all' ? subTab : undefined,
        sortBy: sort,
        page: pageNum,
        limit: 20,
        lat,
        lng
      });

      if (res) {
        setCampaign(res.collection);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
        setPage(res.page || 1);

        if (pageNum === 1) {
          setProducts(res.products || []);
        } else {
          setProducts(prev => [...prev, ...(res.products || [])]);
        }
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [slug, selectedAddress, userLocation, activeSubTab, sortBy]);

  useEffect(() => {
    loadCampaignData(false, 1, activeSubTab, sortBy);
  }, [slug, activeSubTab, sortBy]);

  // Countdown timer effect
  useEffect(() => {
    if (!campaign?.schedule?.endDate) return;

    const interval = setInterval(() => {
      const end = new Date(campaign.schedule.endDate).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Sale Ended');
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(days > 0 ? `${days}d ${hours}h left` : `${hours}h ${mins}m left`);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [campaign?.schedule?.endDate]);

  const handleSubTabChange = (tabId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSubTab(tabId);
  };

  const handleCopyCoupon = (code: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Clipboard.setString(code);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 3000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCampaignData(true, 1, activeSubTab, sortBy);
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    loadCampaignData(false, page + 1, activeSubTab, sortBy);
  };

  const campaignTheme = campaign?.theme || {};
  const primaryColor = campaignTheme.primaryColor || '#CA8A04';
  const secondaryColor = campaignTheme.secondaryColor || '#15803D';
  const gradientStart = campaignTheme.bgGradientStart || '#FEFCE8';
  const gradientEnd = campaignTheme.bgGradientEnd || '#FEF3C7';
  const bannerUrl = campaign?.banner?.imageUrl || campaign?.heroBanner?.imageUrl;

  const subCurations = useMemo(() => {
    const list = [{ id: 'all', label: 'All Fits' }];
    if (campaign?.subCurations && Array.isArray(campaign.subCurations)) {
      list.push(...campaign.subCurations);
    }
    return list;
  }, [campaign?.subCurations]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={[styles.backBtn, { marginTop: Platform.OS === 'android' ? insets.top : 0 }]}
            >
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(app)/search')} 
              style={[styles.backBtn, { marginTop: Platform.OS === 'android' ? insets.top : 0 }]}
            >
              <Ionicons name="search" size={20} color="#0F172A" />
            </TouchableOpacity>
          )
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Festive Header / Hero Section */}
        <LinearGradient
          colors={[gradientStart, gradientEnd, '#FFFFFF']}
          style={[styles.heroContainer, { paddingTop: insets.top + 48 }]}
        >
          {bannerUrl ? (
            <View style={styles.bannerWrapper}>
              <Image 
                source={{ uri: bannerUrl }} 
                style={styles.bannerImage} 
                contentFit="cover"
                transition={400}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.bannerOverlay}
              />
              <View style={styles.bannerContent}>
                {campaign?.badgeText ? (
                  <View style={[styles.badgePill, { backgroundColor: primaryColor }]}>
                    <Text style={styles.badgeText}>{campaign.badgeText}</Text>
                  </View>
                ) : null}
                <Text style={styles.bannerTitle}>{campaign?.name || initialTitle || 'Festive Collection'}</Text>
                {campaign?.tagline ? (
                  <Text style={styles.bannerSubtitle}>{campaign.tagline}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.plainHeader}>
              <View style={styles.plainHeaderContent}>
                {campaign?.badgeText ? (
                  <View style={[styles.badgePill, { backgroundColor: primaryColor }]}>
                    <Text style={styles.badgeText}>{campaign.badgeText}</Text>
                  </View>
                ) : null}
                <Text style={styles.plainTitle}>{campaign?.name || initialTitle || 'Festive Collection'}</Text>
                {campaign?.tagline ? (
                  <Text style={styles.plainSubtitle}>{campaign.tagline}</Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Countdown & Guarantee Strip */}
          <View style={styles.guaranteeStrip}>
            <View style={styles.guaranteeItem}>
              <Ionicons name="flash" size={14} color="#D97706" />
              <Text style={styles.guaranteeText}>15-Min Instant Delivery Available</Text>
            </View>
            {timeLeft ? (
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={12} color="#78350F" />
                <Text style={styles.timerText}>{timeLeft}</Text>
              </View>
            ) : null}
          </View>

          {/* Attached Coupon Banner */}
          {campaign?.attachedOffer && (
            <View style={styles.couponCard}>
              <View style={styles.couponLeft}>
                <View style={styles.couponIconCircle}>
                  <MaterialCommunityIcons name="ticket-percent" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.couponTitle}>
                    {campaign.attachedOffer.discountType === 'percentage' 
                      ? `Flat ${campaign.attachedOffer.discountValue}% OFF`
                      : `₹${campaign.attachedOffer.discountValue} OFF`}
                  </Text>
                  <Text style={styles.couponSubtitle}>
                    Use code <Text style={{ fontWeight: '800', color: '#B45309' }}>{campaign.attachedOffer.couponCode}</Text> at checkout
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleCopyCoupon(campaign.attachedOffer.couponCode)}
                style={[styles.copyBtn, copiedCoupon && styles.copiedBtn]}
              >
                <Text style={[styles.copyBtnText, copiedCoupon && { color: '#059669' }]}>
                  {copiedCoupon ? 'APPLIED ✓' : 'TAP TO COPY'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sub-Curation Mood Tabs */}
          {subCurations.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subTabsContainer}
            >
              {subCurations.map((tab) => {
                const isSelected = activeSubTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => handleSubTabChange(tab.id)}
                    style={[
                      styles.subTabPill,
                      isSelected && { backgroundColor: primaryColor, borderColor: primaryColor }
                    ]}
                  >
                    <Text
                      style={[
                        styles.subTabText,
                        isSelected && { color: '#FFFFFF', fontWeight: '800' }
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </LinearGradient>

        {/* Results Bar */}
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCountText}>
            {totalCount} {totalCount === 1 ? 'Fit Available' : 'Fits Available'}
          </Text>

          {/* Sort selector */}
          <View style={styles.sortContainer}>
            <TouchableOpacity 
              onPress={() => {
                const nextSort: SortOption = sortBy === 'relevance' ? 'price_low' : sortBy === 'price_low' ? 'price_high' : sortBy === 'price_high' ? 'newest' : 'relevance';
                setSortBy(nextSort);
              }}
              style={styles.sortButton}
            >
              <Ionicons name="swap-vertical" size={14} color="#64748B" />
              <Text style={styles.sortButtonText}>
                {sortBy === 'relevance' ? 'Featured' : sortBy === 'price_low' ? 'Price: Low' : sortBy === 'price_high' ? 'Price: High' : 'Newest'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Grid */}
        <View style={styles.gridContainer}>
          {loading ? (
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={{ width: COLUMN_WIDTH, marginBottom: 16 }}>
                  <Skeleton width={COLUMN_WIDTH} height={230} borderRadius={16} style={{ marginBottom: 8 }} />
                  <Skeleton width={COLUMN_WIDTH * 0.8} height={16} borderRadius={6} style={{ marginBottom: 4 }} />
                  <Skeleton width={COLUMN_WIDTH * 0.5} height={14} borderRadius={6} />
                </View>
              ))}
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shirt-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No fits found for this filter</Text>
              <Text style={styles.emptySubtitle}>Try switching to "All Fits" or check back shortly</Text>
              <TouchableOpacity
                onPress={() => handleSubTabChange('all')}
                style={[styles.resetBtn, { backgroundColor: primaryColor }]}
              >
                <Text style={styles.resetBtnText}>View All Fits</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.productsWrap}>
              {products.map((item, idx) => (
                <View key={item._id || item.variantId || idx} style={styles.productCardWrapper}>
                  <ProductCard
                    product={item}
                    width={COLUMN_WIDTH}
                    isNearby={item.isInstantBuyable || item.isNearby}
                    isOnline={item.isOnline !== false}
                    onPress={() => {
                      router.push({
                        pathname: `/(app)/product/${item._id || item.id}` as any,
                        params: { 
                          id: item._id || item.id, 
                          fromExplore: 'false',
                          variantId: item.variantId || undefined
                        },
                      });
                    }}
                  />
                </View>
              ))}
            </View>
          )}

          {loadingMore && (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={primaryColor} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroContainer: {
    paddingBottom: 16,
  },
  bannerWrapper: {
    marginHorizontal: 16,
    borderRadius: 24,
    height: 200,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#FEF3C7',
    fontWeight: '600',
    marginTop: 2,
  },
  plainHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  plainHeaderContent: {
    alignItems: 'flex-start',
  },
  plainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  plainSubtitle: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '700',
    marginTop: 3,
  },
  guaranteeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  guaranteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guaranteeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78350F',
  },
  couponCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#CA8A04',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  couponIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  couponSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  copiedBtn: {
    backgroundColor: '#D1FAE5',
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  subTabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  subTabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  productsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCardWrapper: {
    width: COLUMN_WIDTH,
    marginBottom: 16,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  resetBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
