import { getMyWishlist } from '@/api/wishlist';
import { fetchRecommendedProductsData, fetchTrendingProductsData } from '@/api/products';
import ProductCard from '@/components/common/ProductCard';
import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import MainHeader from '@/components/layout/MainHeader';
import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAddress } from '@/context/AddressContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import Loader from '@/components/common/Loader';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import {
  Dimensions,
  StyleSheet,
  View,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export default function StandaloneWishlistScreen() {
  const router = useRouter();
  const { wishlistIds } = useWishlist();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [headerHeight, setHeaderHeight] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // ── Fetch Full Wishlist ──
  const fetchFullWishlist = async () => {
    try {
      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
      const response = await getMyWishlist(lat, lng);
      const items = response?.wishlist || [];

      const mappedProducts = items
        .map((item: any) => {
          if (!item.product) return null;
          return {
            ...item.product,
            wishlistItemId: item._id,
          };
        })
        .filter(Boolean);

      setWishlistItems(mappedProducts);
    } catch (error) {
      console.error('Failed to fetch wishlist items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Fetch Suggested / Recommended Products (Gender-Free & Wishlist-Driven) ──
  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

      // Smart Wishlist-driven recommendation:
      // Gender is intentionally undefined so the backend engine personalizes recommendations
      // directly based on what is in the user's wishlist (e.g. Men's shirt -> Men's shirts)
      const currentWishlistIds = wishlistIds.map(String);
      let list = await fetchRecommendedProductsData(undefined, lat, lng, currentWishlistIds);

      // Supplement with trending products if recommended list is small
      if (!Array.isArray(list) || list.length < 4) {
        const trending = await fetchTrendingProductsData(undefined, lat, lng);
        if (Array.isArray(trending) && trending.length > 0) {
          list = Array.isArray(list) ? [...list, ...trending] : trending;
        }
      }

      if (Array.isArray(list)) {
        // Exclude products that are already in the user's wishlist and deduplicate
        const wishlistedSet = new Set(wishlistIds.map(String));
        const seen = new Set();
        const filtered = list.filter((p: any) => {
          const id = String(p._id);
          if (wishlistedSet.has(id) || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setSuggestedProducts(filtered);
      }
    } catch (err) {
      console.warn('Failed to fetch wishlist suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchFullWishlist();
  }, [wishlistIds]);

  useEffect(() => {
    fetchSuggestions();
  }, [selectedAddress, userLocation, wishlistIds.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchFullWishlist(), fetchSuggestions()]).finally(() => {
      setRefreshing(false);
    });
  }, [selectedAddress, userLocation, wishlistIds.length]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size={60} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MainHeader onHeaderLayout={setHeaderHeight} />

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

          {/* Header Bar */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color="#0F172A" />
              </TouchableOpacity>
              <ThemedText type="title" style={styles.title}>My Wishlist</ThemedText>
            </View>
            <ThemedText style={styles.count}>{wishlistItems.length} Items</ThemedText>
          </View>

          {/* Wishlist Items Grid or Empty Banner */}
          {wishlistItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="heart-outline" size={54} color={theme.primary} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>Your wishlist is empty</ThemedText>
              <ThemedText style={styles.emptyText}>
                Explore suggested styles below and tap the heart icon to save your favorite fits!
              </ThemedText>
            </View>
          ) : (
            <View style={styles.grid}>
              {wishlistItems.map((product) => (
                <View key={`${product._id}_${product.variantId}`} style={styles.cardWrapper}>
                  <ProductCard
                    product={product}
                    width={COLUMN_WIDTH}
                    fromExplore={true}
                    isNearby={product.isInstantBuyable || product.isNearby}
                    isOnline={product.isOnline !== false}
                  />
                </View>
              ))}
            </View>
          )}

          {/* ─── SUGGESTIONS SECTION ─── */}
          {wishlistItems.length === 0 ? (
            /* When empty: Full 2-column suggestions grid */
            <View style={styles.suggestionsContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="sparkles" size={18} color={theme.primary} />
                  <ThemedText style={styles.sectionTitle}>Recommended For You</ThemedText>
                </View>
                <ThemedText style={styles.sectionSubtitle}>
                  Trending fits curated for your style
                </ThemedText>
              </View>

              {loadingSuggestions ? (
                <View style={styles.suggestionsLoading}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText style={styles.loadingText}>Curating suggestions...</ThemedText>
                </View>
              ) : (
                <View style={styles.grid}>
                  {suggestedProducts.map((product) => (
                    <View key={`sugg_${product._id}_${product.variantId || ''}`} style={styles.cardWrapper}>
                      <ProductCard
                        product={product}
                        width={COLUMN_WIDTH}
                        fromExplore={true}
                        isNearby={product.isInstantBuyable || product.isNearby}
                        isOnline={product.isOnline !== false}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* When wishlist has items: Sleek horizontal carousel "You May Also Like" */
            suggestedProducts.length > 0 && (
              <View style={styles.carouselContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="sparkles" size={18} color={theme.primary} />
                    <ThemedText style={styles.sectionTitle}>You May Also Like</ThemedText>
                  </View>
                  <ThemedText style={styles.sectionSubtitle}>
                    Similar pieces matching your wishlist
                  </ThemedText>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollList}
                >
                  {suggestedProducts.map((product) => (
                    <View key={`sugg_h_${product._id}_${product.variantId || ''}`} style={styles.horizontalCardWrapper}>
                      <ProductCard
                        product={product}
                        width={160}
                        fromExplore={true}
                        isNearby={product.isInstantBuyable || product.isNearby}
                        isOnline={product.isOnline !== false}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )
          )}
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
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  count: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardWrapper: {
    width: COLUMN_WIDTH,
    marginBottom: 8,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 36,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  // Section Headers
  sectionHeader: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 24,
  },

  // Suggestions for empty state
  suggestionsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 24,
  },
  suggestionsLoading: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },

  // Carousel for non-empty state
  carouselContainer: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
  },
  horizontalScrollList: {
    paddingVertical: 6,
    paddingRight: 16,
    gap: 14,
  },
  horizontalCardWrapper: {
    width: 160,
  },
});
