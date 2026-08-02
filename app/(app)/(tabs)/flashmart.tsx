import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import logo from '@/assets/images/logo/logo.png';
import * as Haptics from 'expo-haptics';
import MainHeader from '@/components/layout/MainHeader';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import ProductCard from '@/components/common/ProductCard';
import Skeleton from '@/components/common/Skeleton';
import AvailableBrandsSection from '@/components/sections/AvailableBrandsSection';

import { useGender } from '@/context/GenderContext';
import { useAddress } from '@/context/AddressContext';
import { GenderThemes, Typography } from '@/constants/theme';
import { fetchWarehouseProducts, fetchWarehouseMerchants } from '@/api/products';
import { fetchMerchants } from '@/api/merchants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;

const CATEGORY_TAGS = ['All Items', 'Sneakers', 'T-Shirts', 'Hoodies', 'Jeans', 'Activewear', 'Accessories'];

export default function FlashMartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedGender, selectedSubGender } = useGender();
  const { selectedAddress, userLocation } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  const [products, setProducts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [warehouseMerchants, setWarehouseMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All Items');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const apiGender = selectedGender === 'Kids' && selectedSubGender !== 'All'
        ? selectedSubGender.toUpperCase()
        : (selectedGender === 'Kids' ? 'KIDS' : selectedGender.toUpperCase());

      const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;

      const [warehouseData, merchantsRes, warehouseMerchantsRes] = await Promise.all([
        fetchWarehouseProducts(
          apiGender,
          1,
          lat,
          lng
        ),
        fetchMerchants(lat, lng, selectedGender, true).catch(() => null),
        fetchWarehouseMerchants(lat, lng).catch(() => null),
      ]);

      const items = Array.isArray(warehouseData)
        ? warehouseData
        : (warehouseData?.data?.products || warehouseData?.products || warehouseData?.cards || []);
      setProducts(items);

      const merchantList = merchantsRes?.merchants || merchantsRes?.data?.merchants || [];
      setMerchants(merchantList);

      const whMerchantList = warehouseMerchantsRes?.merchants || warehouseMerchantsRes?.data?.merchants || [];
      setWarehouseMerchants(whMerchantList);
    } catch (error) {
      console.error('Failed to load FlashMart data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedGender, selectedSubGender, selectedAddress, userLocation]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    await loadData();
  };

  // Filter products by selected category tag
  const filteredProducts = useMemo(() => {
    if (activeCategoryFilter === 'All Items') return products;
    const searchLower = activeCategoryFilter.toLowerCase();
    return products.filter((item) => {
      const title = (item.title || item.name || '').toLowerCase();
      const catName = (item.category?.name || item.category || '').toLowerCase();
      const subCat = (item.subCategory || '').toLowerCase();
      return (
        title.includes(searchLower) ||
        catName.includes(searchLower) ||
        subCat.includes(searchLower)
      );
    });
  }, [products, activeCategoryFilter]);

  // Featured bestseller products (top items)
  const featuredProducts = useMemo(() => {
    return products.slice(0, 6);
  }, [products]);

  // Merchants/Stores whose products are stocked in the in-range dark store warehouse
  const connectedWarehouseMerchants = useMemo(() => {
    const isWarehouseEntity = (item: any) => {
      if (!item) return true;
      if (item.isWarehouse) return true;
      const name = (item.shopName || item.name || '').toLowerCase();
      if (name.includes('warehouse') || name.includes('ff kaloor') || name.includes('flashfits hub')) {
        return true;
      }
      return false;
    };

    return warehouseMerchants.filter((m) => {
      if (isWarehouseEntity(m)) return false;
      if (!m.genderCategory || m.genderCategory.length === 0) return true;
      return (
        m.genderCategory.includes(selectedGender) ||
        m.genderCategory.some((g: string) => g.toUpperCase() === selectedGender.toUpperCase())
      );
    });
  }, [warehouseMerchants, selectedGender]);

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
          {/* Header Spacer to avoid layout overlap */}
          {headerHeight > 0 && <View style={{ height: headerHeight }} />}



          {/* ── 3. Brands Available Section ── */}
          {connectedWarehouseMerchants.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <AvailableBrandsSection
                initialMerchants={connectedWarehouseMerchants}
                refreshKey={refreshKey}
                hideExploreLink={false}
                sectionTitle="Brands Available"
                sectionSubtitle="Brands connected to local dark store warehouses"
              />
            </View>
          )}

          {/* ── 4. Category Filters ── */}
          <View style={styles.filterSection}>
            <View style={styles.filterHeaderRow}>
              <View style={styles.filterHeaderLeft}>
                <View style={styles.filterHeaderIconBg}>
                  <Ionicons name="grid-outline" size={16} color={theme.primary || '#000000'} />
                </View>
                <View>
                  <Text style={styles.filterSectionTitle}>Explore {selectedGender}'s Products</Text>
                  <Text style={styles.filterSectionSub}>Doorstep fitting available in 60 mins</Text>
                </View>
              </View>
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{filteredProducts.length} Items</Text>
              </View>
            </View>

            {/* Category Quick Tags */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {CATEGORY_TAGS.map((cat) => {
                const isSelected = activeCategoryFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveCategoryFilter(cat);
                    }}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.chipActiveDot} />}
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── 5. Express Bestsellers (Horizontal Carousel) ── */}
          {!loading && featuredProducts.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>⚡ Dark Store Bestsellers</Text>
                  <Text style={styles.sectionSubtitle}>Top requested items ready for doorstep trial</Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingTop: 4, paddingBottom: 8 }}
              >
                {featuredProducts.map((prod, idx) => (
                  <View key={prod._id || idx} style={{ width: 160 }}>
                    <ProductCard
                      product={{
                        ...prod,
                        isWarehouseListing: true,
                        source: 'warehouse',
                      }}
                      width={160}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── 6. All Warehouse Products (2-Column Grid) ── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>All Warehouse Products</Text>
                <Text style={styles.sectionSubtitle}>
                  {loading
                    ? 'Fetching live dark store inventory...'
                    : `${filteredProducts.length} items available in your location`}
                </Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE STOCK</Text>
              </View>
            </View>

            {loading && !refreshing ? (
              <View style={styles.gridContainer}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ width: CARD_WIDTH, marginBottom: 16 }}>
                    <Skeleton width={CARD_WIDTH} height={200} borderRadius={16} />
                    <Skeleton width={CARD_WIDTH * 0.7} height={16} borderRadius={4} style={{ marginTop: 8 }} />
                    <Skeleton width={CARD_WIDTH * 0.4} height={14} borderRadius={4} style={{ marginTop: 4 }} />
                  </View>
                ))}
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="cube-outline" size={36} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No Warehouse Products</Text>
                <Text style={styles.emptySub}>
                  No items found matching "{activeCategoryFilter}" for {selectedGender}. Try selecting another filter tag!
                </Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {filteredProducts.map((item, index) => (
                  <View key={item._id || index} style={{ width: CARD_WIDTH, marginBottom: 16 }}>
                    <ProductCard
                      product={{
                        ...item,
                        isWarehouseListing: true,
                        source: 'warehouse',
                      }}
                      width={CARD_WIDTH}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── 7. Brand Footer ── */}
          <View style={{ padding: 20, marginTop: 10 }}>
            <View style={styles.footer}>
              <Image source={logo} style={styles.footerLogo} contentFit="contain" />
              <Text style={styles.taglineText}>FASHION IN A FLASH</Text>
              <Text style={styles.versionText}>MADE IN INDIA ❤️</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </PremiumRefreshWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* Filters */
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  filterHeaderIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSectionTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  filterSectionSub: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 1,
  },
  filterCountBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterCountText: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genderPillText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  categoryChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  categoryChipText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },

  /* Sections */
  sectionContainer: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#059669',
    letterSpacing: 0.4,
  },

  /* Grid */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  footerLogo: {
    width: 120,
    height: 40,
    opacity: 0.85,
  },
  taglineText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 2,
    color: '#94A3B8',
    marginTop: 6,
  },
  versionText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 1,
    color: '#CBD5E1',
    marginTop: 4,
  },
});

