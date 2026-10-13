import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { fetchProductsByMerchant, fetchWarehouseProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard';
import Skeleton from '@/components/common/Skeleton';
import { Typography, BrandColors } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';

interface MerchantMoreProductsProps {
  merchantId: string;
  shopName?: string;
  cartProductIds?: (string | undefined)[];
  isOnline?: boolean;
  isNearby?: boolean;
  lat?: number;
  lng?: number;
  isWarehouse?: boolean;
  containerStyle?: any;
}

export default function MerchantMoreProducts({
  merchantId,
  shopName = 'Store',
  cartProductIds = [],
  isOnline = true,
  isNearby = false,
  lat: propLat,
  lng: propLng,
  isWarehouse = false,
  containerStyle,
}: MerchantMoreProductsProps) {
  const router = useRouter();
  const { selectedAddress, userLocation } = useAddress();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveLat = propLat ?? selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
  const effectiveLng = propLng ?? selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

  const isWarehouseMerchant = useMemo(() => {
    if (isWarehouse) return true;
    const lowerId = (merchantId || '').toLowerCase();
    const lowerName = (shopName || '').toLowerCase();
    return (
      lowerId === 'flashmart' ||
      lowerId === 'ff-warehouse-hub' ||
      lowerId === 'warehouse' ||
      lowerId.includes('warehouse') ||
      lowerName.includes('warehouse') ||
      lowerName.includes('flashfit mart') ||
      lowerName.includes('flashfits mart')
    );
  }, [merchantId, shopName, isWarehouse]);

  useEffect(() => {
    let isMounted = true;

    if (!merchantId || merchantId === 'unknown') {
      setLoading(false);
      return;
    }

    const loadMerchantProducts = async () => {
      try {
        setLoading(true);
        const res = await fetchProductsByMerchant(merchantId, effectiveLat, effectiveLng).catch(() => null);

        let items = res?.products || res?.data?.products || res?.data || (Array.isArray(res) ? res : []);

        // Fallback for warehouse stores if merchant products are empty
        if ((!items || items.length === 0) && isWarehouseMerchant) {
          const whRes = await fetchWarehouseProducts('All', 1, effectiveLat, effectiveLng).catch(() => null);
          items = whRes?.cards || whRes?.data?.cards || whRes?.products || whRes?.data || [];
        }

        if (isMounted) {
          setProducts(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        if (isMounted) {
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMerchantProducts();

    return () => {
      isMounted = false;
    };
  }, [merchantId, effectiveLat, effectiveLng, isWarehouseMerchant]);

  // Exclude products that are already in the cart so recommendations stay fresh
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const excludedIds = new Set(
      cartProductIds
        .filter(Boolean)
        .map((id) => String(id).toLowerCase())
    );

    return products.filter((p: any) => {
      const pId = String(p._id || p.id || '').toLowerCase();
      return !excludedIds.has(pId);
    });
  }, [products, cartProductIds]);

  const handleViewStore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/merchant/[id]',
      params: {
        id: merchantId,
        shopName: shopName,
        isWarehouse: isWarehouseMerchant ? 'true' : 'false',
      },
    } as any);
  };

  // If loading, show shimmer skeleton
  if (loading) {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Skeleton width={34} height={34} borderRadius={17} />
            <View style={{ gap: 4 }}>
              <Skeleton width={140} height={15} borderRadius={4} />
              <Skeleton width={95} height={11} borderRadius={4} />
            </View>
          </View>
          <Skeleton width={68} height={26} borderRadius={13} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productListContent}
          nestedScrollEnabled
        >
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCardWrapper}>
              <Skeleton width={140} height={210} borderRadius={14} style={{ marginBottom: 8 }} />
              <Skeleton width={110} height={14} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width={65} height={14} borderRadius={4} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // If no products available from this merchant, render nothing cleanly
  if (filteredProducts.length === 0) {
    return null;
  }

  // Display up to 8 top products from this merchant
  const displayedProducts = filteredProducts.slice(0, 8);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header with Title and "See All" trigger */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="storefront-outline" size={16} color={BrandColors.matteBlack} />
          </View>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text style={styles.title} numberOfLines={1}>
              More from {shopName}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Discover more styles from this store
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.seeAllButton}
          activeOpacity={0.7}
          onPress={handleViewStore}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Carousel of Products */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productListContent}
        nestedScrollEnabled
      >
        {displayedProducts.map((item: any, index: number) => (
          <ProductCard
            key={item._id || item.id || String(index)}
            product={item}
            width={140}
            isNearby={isNearby || item.isInstantBuyable || item.isNearby}
            isOnline={isOnline !== false && item.isOnline !== false}
            onPress={() => {
              router.push({
                pathname: `/(app)/product/${item._id || item.id}` as any,
                params: {
                  id: item._id || item.id,
                  fromStore: 'true',
                  variantId: item.variantId || undefined,
                },
              });
            }}
          />
        ))}

        {/* End Card to view all products in store */}
        <TouchableOpacity
          style={styles.viewMoreEndCard}
          activeOpacity={0.8}
          onPress={handleViewStore}
        >
          <View style={styles.viewMoreIconCircle}>
            <Ionicons name="arrow-forward" size={18} color="#0F172A" />
          </View>
          <Text style={styles.viewMoreEndTitle}>See More</Text>
          <Text style={styles.viewMoreEndSubtitle} numberOfLines={2}>
            from {shopName}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Navigation CTA Bar */}
      <TouchableOpacity
        style={styles.bottomNavStrip}
        activeOpacity={0.75}
        onPress={handleViewStore}
      >
        <View style={styles.bottomNavLeft}>
          <Ionicons name="bag-handle-outline" size={15} color="#475569" />
          <Text style={styles.bottomNavText} numberOfLines={1}>
            See more products from {shopName}
          </Text>
        </View>
        <View style={styles.bottomNavArrow}>
          <Text style={styles.bottomNavCtaText}>Visit Store</Text>
          <Ionicons name="arrow-forward" size={13} color="#0F172A" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 1,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  seeAllText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  productListContent: {
    paddingHorizontal: 14,
    paddingRight: 4,
    alignItems: 'flex-start',
  },
  skeletonCardWrapper: {
    width: 140,
    marginRight: 10,
  },
  viewMoreEndCard: {
    width: 125,
    height: 265,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginRight: 14,
  },
  viewMoreIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  viewMoreEndTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#0F172A',
    textAlign: 'center',
  },
  viewMoreEndSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  bottomNavStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bottomNavLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  bottomNavText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
  },
  bottomNavArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomNavCtaText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#0F172A',
  },
});
