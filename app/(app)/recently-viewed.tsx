import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors, GenderThemes, Typography } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';
import { getRecentlyViewed, Product } from '@/utils/recentlyViewed';
import ProductCard from '@/components/common/ProductCard';
import Loader from '@/components/common/Loader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - CARD_GAP) / 2;

export default function RecentlyViewedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const lat =
        selectedAddress?.location?.coordinates?.[1] ??
        (selectedAddress as any)?.latitude ??
        userLocation?.latitude;
      const lng =
        selectedAddress?.location?.coordinates?.[0] ??
        (selectedAddress as any)?.longitude ??
        userLocation?.longitude;

      const data = await getRecentlyViewed(lat, lng);
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load recently viewed products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAddress, userLocation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData(true);
  }, [loadData]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.cardContainer}>
        <ProductCard
          product={item}
          width={CARD_WIDTH}
          fromExplore={true}
          isNearby={item.isInstantBuyable || item.isNearby}
          isOnline={item.isOnline !== false}
          onPress={() => {
            router.push({
              pathname: '/(app)/product/[id]' as any,
              params: {
                id: item._id || item.id,
                variantId: item.variantId || undefined,
              },
            });
          }}
        />
      </View>
    ),
    [router]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Mask for Status Bar */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: '#FFFFFF',
          zIndex: 100,
        }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Recently Viewed</Text>
          {!loading && (
            <Text style={styles.headerSubtitle}>
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/search' as any)}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <Loader size={54} />
          <Text style={styles.loadingText}>Loading recently viewed items…</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="time-outline" size={52} color="#64748B" />
          </View>
          <Text style={styles.emptyTitle}>No Recently Viewed Items</Text>
          <Text style={styles.emptySubtitle}>
            Outfits and items you explore will automatically appear here so you can pick up where you left off.
          </Text>
          <TouchableOpacity
            style={[styles.exploreBtn, { backgroundColor: theme.primary || BrandColors.matteBlack }]}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(app)/(tabs)' as any);
            }}
          >
            <Text style={styles.exploreBtnText}>Explore Fits</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item: any, index: number) =>
            `${item._id || item.id || index}-${item.variantId || index}`
          }
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 1,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  exploreBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
