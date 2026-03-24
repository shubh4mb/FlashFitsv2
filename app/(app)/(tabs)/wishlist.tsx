import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl,
  Dimensions
} from 'react-native';
import { useWishlist } from '@/context/WishlistContext';
import { getMyWishlist } from '@/api/wishlist';
import ProductCard from '@/components/common/ProductCard';
import MainHeader from '@/components/layout/MainHeader';
import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import { useGender } from '@/context/GenderContext';
import { GenderThemes } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export default function WishlistScreen() {
  const { wishlistIds } = useWishlist();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFullWishlist = async () => {
    try {
      const response = await getMyWishlist();
      const items = response?.wishlist || [];
      
      // Map to ProductCard expectations
      const mappedProducts = items.map((item: any) => ({
        _id: item.product._id,
        name: item.product.name,
        price: item.product.variant.price,
        mrp: item.product.variant.mrp,
        images: [{ url: item.product.variant.image || '' }],
        ratings: 4.5, // Placeholder
        isTriable: true, // Placeholder
        variants: [item.product.variant]
      }));
      
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
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MainHeader />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
      >
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
                  onPress={() => {}} // Navigate to product detail later
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
