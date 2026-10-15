import { fetchCourierProducts } from '@/api/products';
import { fetchCollectionsExplore } from '@/api/collections';
import BrandFooter from '@/components/common/BrandFooter';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import ProductCard from '@/components/common/ProductCard';
import CompactStoreCard from '@/components/common/CompactStoreCard';
import MainHeader from '@/components/layout/MainHeader';
import KidsComingSoonSection from '@/components/sections/KidsComingSoonSection';
import SlimFreeDeliveryBanner from '@/components/common/SlimFreeDeliveryBanner';
import { GenderThemes, Typography } from '@/constants/theme';
import { useAddress, distanceInMeters, DEFAULT_FALLBACK_COORDS } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';
import { Product } from '@/utils/recentlyViewed';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 34) / 2; // 2-column grid with reduced padding (12 left + 12 right + 10 gap)
const COLLECTION_CARD_WIDTH = SCREEN_WIDTH - 24;

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
  isWarehouse?: boolean;
  rating?: number;
  stats?: {
    totalProducts?: number;
  };
  genderCategory?: string[];
  address?: {
    city?: string;
    street?: string;
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
  const [collections, setCollections] = useState<any[]>([]);
  const [activeCollectionIdx, setActiveCollectionIdx] = useState(0);
  const collectionScrollRef = React.useRef<ScrollView>(null);
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
    if (!mCoords || !userLat || !userLng) {
      return merchant.address?.city || null;
    }
    const dist = distanceInMeters(userLat, userLng, mCoords[1], mCoords[0]);
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    }
    if (dist <= 50000) {
      return `${(dist / 1000).toFixed(1)} km`;
    }
    return merchant.address?.city || `${(dist / 1000).toFixed(0)} km`;
  };

  const loadData = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (selectedGender === 'Kids') {
        setProducts([]);
        setCollections([]);
        setMerchants([]);
        setLoading(false);
        return;
      }
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const lat =
        selectedAddress?.location?.coordinates?.[1] ??
        (selectedAddress as any)?.latitude ??
        userLocation?.latitude ??
        DEFAULT_FALLBACK_COORDS.latitude;
      const lng =
        selectedAddress?.location?.coordinates?.[0] ??
        (selectedAddress as any)?.longitude ??
        userLocation?.longitude ??
        DEFAULT_FALLBACK_COORDS.longitude;

      const [data, collectionsData] = await Promise.all([
        fetchCourierProducts(apiGender, pageNum, lat, lng),
        pageNum === 1 ? fetchCollectionsExplore(apiGender, lat, lng) : Promise.resolve(null),
      ]);

      const fetched = data?.products || [];

      if (append) {
        setProducts(prev => [...prev, ...fetched]);
      } else {
        setProducts(fetched);
        setMerchants(data?.merchants || []);
        if (collectionsData) {
          const parsed = Array.isArray(collectionsData) ? collectionsData : (collectionsData?.data || []);
          setCollections(parsed);
        }
      }

      setHasMore(pageNum < (data?.totalPages || 1));
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading explore products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [
    apiGender,
    selectedAddress?._id,
    selectedAddress?.location?.coordinates,
    (selectedAddress as any)?.latitude,
    (selectedAddress as any)?.longitude,
    userLocation?.latitude,
    userLocation?.longitude,
  ]);

  useEffect(() => {
    loadData(1, false);
  }, [loadData, refreshKey]);

  // Auto-scroll collection carousel when multiple collections exist
  useEffect(() => {
    if (collections.length <= 1) return;
    const timer = setInterval(() => {
      setActiveCollectionIdx((prev) => {
        const next = (prev + 1) % collections.length;
        collectionScrollRef.current?.scrollTo({ x: next * COLLECTION_CARD_WIDTH, animated: true });
        return next;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [collections.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    await loadData(1, false);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading && products.length > 0) {
      loadData(page + 1, true);
    }
  };

  const renderProduct = useCallback(({ item }: { item: any }) => (
    <View style={styles.cardWrapper}>
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
      <View key={item._id} style={{ marginRight: 10 }}>
        <CompactStoreCard
          merchant={item as any}
          onPress={() => {
            const isWh = (item as any).isWarehouse || item.shopName?.toLowerCase().includes('warehouse') || item.shopName?.toLowerCase().includes('mart');
            router.push({
              pathname: '/merchant/[id]',
              params: {
                id: item._id,
                fromExplore: 'true',
                shopName: item.shopName,
                isWarehouse: isWh ? 'true' : 'false',
              }
            } as any);
          }}
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
        {selectedGender === 'Kids' ? (
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={[styles.listContent, { paddingTop: headerHeight || 0 }]}
          >
            <KidsComingSoonSection tabType="explore" onRefresh={onRefresh} refreshing={refreshing} />
            <BrandFooter />
            <View style={{ height: 100 }} />
          </Animated.ScrollView>
        ) : (
          <Animated.FlatList
            data={products}
          renderItem={renderProduct}
          keyExtractor={(item: any, index: number) => item._id || String(index)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingTop: headerHeight || 0 }]}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={15}
          ListHeaderComponent={
            <View>
              {/* Slim Free Delivery & Referral Banner */}
              <SlimFreeDeliveryBanner breakoutPadding={12} style={{ marginTop: 4, marginBottom: 6 }} />

              {/* Courier Info Banner */}
              <View style={styles.infoBanner}>
                <View style={[styles.infoBannerIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="compass-outline" size={28} color={theme.primary} />
                </View>
                <View style={styles.infoBannerText}>
                  <Text style={styles.infoBannerTitle}>Explore Curated Fits & Drops</Text>
                  <Text style={styles.infoBannerSubtitle}>
                    Shop from anywhere • Flat ₹40 delivery • Delivery across Country
                  </Text>
                </View>
              </View>

              {/* ── Featured Collections Section (Carousel) ── */}
              {collections.length > 0 && (() => {
                const activeColl = collections[activeCollectionIdx] || collections[0];
                return (
                  <View style={styles.collectionContainer}>
                    {collections.length > 1 ? (
                      <View>
                        {/* Horizontal Carousel of Hero Cards */}
                        <ScrollView
                          ref={collectionScrollRef}
                          horizontal
                          pagingEnabled
                          showsHorizontalScrollIndicator={false}
                          nestedScrollEnabled={true}
                          onMomentumScrollEnd={(e) => {
                            const offset = e.nativeEvent.contentOffset.x;
                            const idx = Math.round(offset / COLLECTION_CARD_WIDTH);
                            if (idx >= 0 && idx < collections.length) {
                              setActiveCollectionIdx(idx);
                            }
                          }}
                        >
                          {collections.map((coll, idx) => {
                            const bgImg = coll.heroBanner?.imageUrl || coll.banner?.imageUrl || coll.bannerImage?.url || 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1200&q=80';
                            return (
                              <TouchableOpacity
                                key={`collection-card-${coll._id || coll.slug || idx}`}
                                activeOpacity={0.92}
                                style={[styles.collectionHeroCard, { width: COLLECTION_CARD_WIDTH }]}
                                onPress={() => router.push(`/campaign/${coll.slug}` as any)}
                              >
                                <Image
                                  source={{ uri: bgImg }}
                                  style={StyleSheet.absoluteFillObject}
                                  contentFit="cover"
                                  transition={200}
                                  cachePolicy="memory-disk"
                                />
                                <LinearGradient
                                  colors={['transparent', 'rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.92)']}
                                  locations={[0.1, 0.45, 0.95]}
                                  style={StyleSheet.absoluteFillObject}
                                />
                                <View style={styles.collectionHeroContent}>
                                  <View style={styles.collectionBadge}>
                                    <Text style={styles.collectionBadgeText}>{coll.badgeText || '🔥 CURATED DROP'}</Text>
                                  </View>
                                  <Text style={styles.collectionHeroTitle} numberOfLines={1}>{coll.name}</Text>
                                  <Text style={styles.collectionHeroSubtitle} numberOfLines={2}>
                                    {coll.tagline || coll.description || 'Exclusive curated collection'}
                                  </Text>
                                  <View style={styles.collectionActionRow}>
                                    <View style={styles.collectionActionBtn}>
                                      <Text style={styles.collectionActionText}>Explore Drop</Text>
                                      <Ionicons name="arrow-forward" size={13} color="#0F172A" />
                                    </View>
                                    {coll.products?.length > 0 && (
                                      <Text style={styles.collectionProductCount}>
                                        {coll.products.length}+ Styles
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        {/* Carousel Dot Indicators */}
                        <View style={styles.carouselDotsRow}>
                          {collections.map((coll, idx) => (
                            <TouchableOpacity
                              key={`dot-${coll._id || coll.slug || idx}`}
                              onPress={() => {
                                collectionScrollRef.current?.scrollTo({ x: idx * COLLECTION_CARD_WIDTH, animated: true });
                                setActiveCollectionIdx(idx);
                              }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={[
                                styles.carouselDot,
                                idx === activeCollectionIdx && [styles.carouselDotActive, { backgroundColor: theme.primary }],
                              ]}
                            />
                          ))}
                        </View>

                        {/* Quick Collection Switcher Pills */}
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.collectionTabsContainer}
                        >
                          {collections.map((coll, idx) => {
                            const isSelected = idx === activeCollectionIdx;
                            return (
                              <TouchableOpacity
                                key={`coll-tab-${coll._id || coll.slug || idx}`}
                                onPress={() => {
                                  collectionScrollRef.current?.scrollTo({ x: idx * COLLECTION_CARD_WIDTH, animated: true });
                                  setActiveCollectionIdx(idx);
                                }}
                                style={[
                                  styles.collectionTabChip,
                                  isSelected && [styles.collectionTabChipActive, { backgroundColor: theme.primary }],
                                ]}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.collectionTabText,
                                    isSelected && styles.collectionTabTextActive,
                                  ]}
                                >
                                  {coll.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    ) : (
                      /* Single Collection Card */
                      (() => {
                        const coll = collections[0];
                        const bgImg = coll.heroBanner?.imageUrl || coll.banner?.imageUrl || coll.bannerImage?.url || 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1200&q=80';
                        return (
                          <TouchableOpacity
                            activeOpacity={0.92}
                            style={styles.collectionHeroCard}
                            onPress={() => router.push(`/campaign/${coll.slug}` as any)}
                          >
                            <Image
                              source={{ uri: bgImg }}
                              style={StyleSheet.absoluteFillObject}
                              contentFit="cover"
                              transition={150}
                              cachePolicy="memory-disk"
                            />
                            <LinearGradient
                              colors={['transparent', 'rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.92)']}
                              locations={[0.1, 0.45, 0.95]}
                              style={StyleSheet.absoluteFillObject}
                            />
                            <View style={styles.collectionHeroContent}>
                              <View style={styles.collectionBadge}>
                                <Text style={styles.collectionBadgeText}>{coll.badgeText || '🔥 CURATED DROP'}</Text>
                              </View>
                              <Text style={styles.collectionHeroTitle} numberOfLines={1}>{coll.name}</Text>
                              <Text style={styles.collectionHeroSubtitle} numberOfLines={2}>
                                {coll.tagline || coll.description || 'Exclusive curated collection'}
                              </Text>
                              <View style={styles.collectionActionRow}>
                                <View style={styles.collectionActionBtn}>
                                  <Text style={styles.collectionActionText}>Explore Drop</Text>
                                  <Ionicons name="arrow-forward" size={13} color="#0F172A" />
                                </View>
                                {coll.products?.length > 0 && (
                                  <Text style={styles.collectionProductCount}>
                                    {coll.products.length}+ Styles
                                  </Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })()
                    )}

                    {/* Horizontal Product Shelf for active collection */}
                    {activeColl?.products && activeColl.products.length > 0 && (
                      <View style={styles.shelfWrapper}>
                        <View style={styles.shelfHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.shelfTitle}>{activeColl.name} Highlights</Text>
                            <Text style={styles.shelfSubtitle} numberOfLines={1}>
                              {activeColl.tagline || 'Top picks from this drop'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={styles.seeAllBtn}
                            onPress={() => router.push(`/campaign/${activeColl.slug}` as any)}
                          >
                            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                            <Ionicons name="chevron-forward" size={15} color={theme.primary} />
                          </TouchableOpacity>
                        </View>

                        {/* FlatList with removeClippedSubviews=false so horizontal scrolling NEVER blanks or morphs */}
                        <FlatList
                          data={activeColl.products}
                          horizontal
                          nestedScrollEnabled={true}
                          removeClippedSubviews={false}
                          initialNumToRender={8}
                          maxToRenderPerBatch={8}
                          windowSize={10}
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.horizontalListPadding}
                          keyExtractor={(prod: any) => prod._id || prod.styleGroupId || prod.id}
                          renderItem={({ item: prod }) => (
                            <View style={{ width: 155, marginRight: 12 }}>
                              <ProductCard
                                product={prod}
                                width={155}
                                containerStyle={{ marginRight: 0 }}
                                fromExplore={true}
                                isNearby={prod.isNearby}
                                isOnline={prod.isOnline}
                              />
                            </View>
                          )}
                        />
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Available Stores Section */}
              {merchants.length > 0 && (
                <View style={styles.merchantsSection}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    activeOpacity={0.7}
                    onPress={() => router.push('/(app)/(tabs)/stores' as any)}
                  >
                    <View>
                      <Text style={styles.sectionTitle}>Available Stores</Text>
                      <Text style={styles.sectionSubtitle}>Shipping directly to your doorstep</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                  <FlatList
                    data={merchants}
                    horizontal
                    nestedScrollEnabled={true}
                    removeClippedSubviews={false}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item: any) => item._id}
                    contentContainerStyle={styles.merchantsList}
                    renderItem={renderMerchant as any}
                  />
                </View>
              )}

              {/* All Drops Divider Title */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerBadge}>
                  <Ionicons name="grid-outline" size={13} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.dividerTitle}>All Nationwide Drops</Text>
                </View>
                <View style={styles.dividerLine} />
              </View>
            </View>
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
            <View>
              {loadingMore && (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              )}
              {products.length > 0 && <BrandFooter />}
              <View style={{ height: 100 }} />
            </View>
          }
        />
        )}
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
  cardWrapper: {
    width: CARD_WIDTH,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
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
  // Collection styles
  collectionContainer: {
    marginBottom: 24,
  },
  collectionHeroCard: {
    width: '100%',
    height: 185,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 12,
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  carouselDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
  },
  collectionTabsContainer: {
    paddingHorizontal: 2,
    paddingBottom: 14,
    gap: 8,
  },
  collectionTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  collectionTabChipActive: {
    borderColor: 'transparent',
  },
  collectionTabText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#475569',
  },
  collectionTabTextActive: {
    color: '#FFFFFF',
  },
  collectionHeroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  collectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  collectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  collectionHeroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    marginBottom: 2,
  },
  collectionHeroSubtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  collectionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  collectionActionText: {
    color: '#0F172A',
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
  },
  collectionProductCount: {
    color: '#E2E8F0',
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
  },
  shelfWrapper: {
    marginBottom: 8,
  },
  shelfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  shelfTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
  },
  shelfSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
    marginTop: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#0284C7',
    marginRight: 2,
  },
  horizontalListPadding: {
    paddingRight: 16,
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  dividerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  dividerTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  merchantsSection: {
    marginBottom: 24,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
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
