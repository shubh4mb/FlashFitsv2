import { getMyWishlist } from '@/api/wishlist';
import ProductCard from '@/components/common/ProductCard';
import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import MainHeader from '@/components/layout/MainHeader';
import { GenderThemes } from '@/constants/theme';
import { useGender } from '@/context/GenderContext';
import { useWishlist } from '@/context/WishlistContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import Loader from '@/components/common/Loader';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import {
  Dimensions,
  RefreshControl,
  StyleSheet,
  View,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export default function WishlistScreen() {
  const { wishlistIds } = useWishlist();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [headerHeight, setHeaderHeight] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  const fetchFullWishlist = async () => {
    try {
      const response = await getMyWishlist();
      const items = response?.wishlist || [];

      // Map to ProductCard expectations using the robust extraction logic
      const mappedProducts = items.map((item: any) => {
        if (!item.product) return null;
        
        return {
          ...item.product,
          wishlistItemId: item._id, // Store for removal if needed
          // The robust ProductCard now handles the rest via .variant or .variants
        };
      }).filter(Boolean);

      setWishlistItems(mappedProducts);
    } catch (error) {
      console.error('Failed to fetch wishlist items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFullWishlist();
  }, [wishlistIds]); // Refresh when context IDs change (e.g. item removed from another screen)

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFullWishlist();
  }, []);

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

        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>My Wishlist</ThemedText>
          <ThemedText style={styles.count}>{wishlistItems.length} Items</ThemedText>
        </View>

        {wishlistItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.primary + '10' }]}>
              <Ionicons name="heart-outline" size={60} color={theme.primary} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>Your wishlist is empty</ThemedText>
            <ThemedText style={styles.emptyText}>
              Start adding your favorite items to keep track of them!
            </ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {wishlistItems.map((product) => (
              <View key={product._id} style={styles.cardWrapper}>
                <ProductCard
                  product={product}
                  width={COLUMN_WIDTH}
                  fromExplore={true}
                />
              </View>
            ))}
          </View>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  count: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
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
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
