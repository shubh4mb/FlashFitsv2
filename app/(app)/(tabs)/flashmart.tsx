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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BrandFooter from '@/components/common/BrandFooter';
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

const PRICE_RANGES = [
  { label: 'All Prices', key: null },
  { label: 'Under ₹999', key: 'under_999' },
  { label: '₹1,000 - ₹1,999', key: '1000_1999' },
  { label: '₹2,000 - ₹2,999', key: '2000_2999' },
  { label: 'Above ₹3,000', key: 'above_3000' },
];

const SORT_OPTIONS = [
  { label: 'Recommended & Prioritized', key: 'relevance' },
  { label: 'Price: Low to High', key: 'price_low_high' },
  { label: 'Price: High to Low', key: 'price_high_low' },
  { label: 'Customer Rating', key: 'rating' },
];

export default function FlashMartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { brandId, brandName } = useLocalSearchParams<{ brandId?: string; brandName?: string }>();

  const { selectedGender, selectedSubGender } = useGender();
  const { selectedAddress, userLocation } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(insets.top > 0 ? insets.top + 95 : 145);

  const [products, setProducts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [warehouseMerchants, setWarehouseMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter & Sort state
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(brandId || null);
  const [selectedBrandName, setSelectedBrandName] = useState<string | null>(brandName || null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All Items');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('relevance');

  // Modals state
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Sync with search params if navigated with new brand
  useEffect(() => {
    if (brandId) {
      setSelectedBrandId(brandId);
      if (brandName) setSelectedBrandName(brandName);
    }
  }, [brandId, brandName]);

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

  // Connected warehouse merchants
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

  // Resolve brand name
  const activeBrandName = useMemo(() => {
    if (selectedBrandName) return selectedBrandName;
    if (!selectedBrandId) return '';
    const found = connectedWarehouseMerchants.find((m) => String(m._id) === String(selectedBrandId));
    if (found?.shopName) return found.shopName;
    const foundProd = products.find(
      (p) => String(p.merchantId?._id || p.merchantId) === String(selectedBrandId)
    );
    return foundProd?.merchantId?.shopName || 'Brand';
  }, [selectedBrandId, selectedBrandName, connectedWarehouseMerchants, products]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBrandId) count++;
    if (activeCategoryFilter !== 'All Items') count++;
    if (selectedPriceRange) count++;
    if (sortBy !== 'relevance') count++;
    return count;
  }, [selectedBrandId, activeCategoryFilter, selectedPriceRange, sortBy]);

  const handleClearAllFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBrandId(null);
    setSelectedBrandName(null);
    setActiveCategoryFilter('All Items');
    setSelectedPriceRange(null);
    setSortBy('relevance');
  };

  const getProductPrice = (p: any) => {
    if (p.price !== undefined && p.price !== null) return Number(p.price);
    if (p.variants?.[0]?.price !== undefined) return Number(p.variants[0].price);
    if (p.minPrice !== undefined) return Number(p.minPrice);
    return 0;
  };

  // Processed and prioritized products
  const processedProducts = useMemo(() => {
    let list = [...products];

    // 1. Filter by Category
    if (activeCategoryFilter !== 'All Items') {
      const searchLower = activeCategoryFilter.toLowerCase();
      list = list.filter((item) => {
        const title = (item.title || item.name || '').toLowerCase();
        const catName = (item.category?.name || item.category || '').toLowerCase();
        const subCat = (item.subCategory || '').toLowerCase();
        return (
          title.includes(searchLower) ||
          catName.includes(searchLower) ||
          subCat.includes(searchLower)
        );
      });
    }

    // 2. Filter by Price Range
    if (selectedPriceRange) {
      list = list.filter((item) => {
        const price = getProductPrice(item);
        if (selectedPriceRange === 'under_999') return price < 1000;
        if (selectedPriceRange === '1000_1999') return price >= 1000 && price <= 1999;
        if (selectedPriceRange === '2000_2999') return price >= 2000 && price <= 2999;
        if (selectedPriceRange === 'above_3000') return price >= 3000;
        return true;
      });
    }

    // 3. Sorting & Brand Prioritization
    const isMatchBrand = (p: any) => {
      if (!selectedBrandId) return false;
      const mid = String(p.merchantId?._id || p.merchantId || p.sourceMerchantId || '');
      return mid === String(selectedBrandId);
    };

    if (sortBy === 'price_low_high') {
      list.sort((a, b) => getProductPrice(a) - getProductPrice(b));
    } else if (sortBy === 'price_high_low') {
      list.sort((a, b) => getProductPrice(b) - getProductPrice(a));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (Number(b.ratings) || 0) - (Number(a.ratings) || 0));
    } else {
      // 'relevance' (default): Put prioritized brand's products FIRST
      if (selectedBrandId) {
        const brandItems = list.filter(isMatchBrand);
        const otherItems = list.filter((p) => !isMatchBrand(p));
        list = [...brandItems, ...otherItems];
      }
    }

    return list.map((item) => ({
      ...item,
      isWarehouseListing: true,
      source: 'warehouse',
    }));
  }, [products, activeCategoryFilter, selectedPriceRange, selectedBrandId, sortBy]);

  // Featured bestseller products (top items) - only shown when not filtered by brand
  const featuredProducts = useMemo(() => {
    return products.slice(0, 6).map((item) => ({
      ...item,
      isWarehouseListing: true,
      source: 'warehouse',
    }));
  }, [products]);

  // ── Render Sort Modal ──
  const renderSortModal = () => (
    <Modal
      visible={isSortModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsSortModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsSortModalVisible(false)}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort By</Text>
            <TouchableOpacity onPress={() => setIsSortModalVisible(false)}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingBottom: 24 }}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.sortOption}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSortBy(opt.key);
                    setIsSortModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      isSelected && { color: '#0F172A', fontFamily: Typography.fontFamily.bold },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0F172A" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ── Render Filter Modal ──
  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsFilterModalVisible(false)}
      >
        <View style={[styles.modalContent, { maxHeight: '82%' }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Products</Text>
            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalFilterScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Brands Filter */}
            <Text style={styles.filterSectionHeading}>Prioritize Brand</Text>
            <View style={styles.filterTagsWrap}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedBrandId && styles.filterChipActive]}
                onPress={() => {
                  setSelectedBrandId(null);
                  setSelectedBrandName(null);
                }}
              >
                <Text style={[styles.filterChipText, !selectedBrandId && styles.filterChipTextActive]}>
                  All Brands
                </Text>
              </TouchableOpacity>
              {connectedWarehouseMerchants.map((m) => {
                const isSelected = selectedBrandId === m._id;
                return (
                  <TouchableOpacity
                    key={m._id}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedBrandId(isSelected ? null : m._id);
                      setSelectedBrandName(isSelected ? null : m.shopName);
                    }}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {m.shopName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Category Filter */}
            <Text style={[styles.filterSectionHeading, { marginTop: 20 }]}>Categories</Text>
            <View style={styles.filterTagsWrap}>
              {CATEGORY_TAGS.map((cat) => {
                const isSelected = activeCategoryFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveCategoryFilter(cat);
                    }}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Price Range Filter */}
            <Text style={[styles.filterSectionHeading, { marginTop: 20 }]}>Price Range</Text>
            <View style={styles.filterTagsWrap}>
              {PRICE_RANGES.map((pr) => {
                const isSelected = selectedPriceRange === pr.key;
                return (
                  <TouchableOpacity
                    key={pr.label}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedPriceRange(pr.key);
                    }}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {pr.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalResetBtn}
              onPress={handleClearAllFilters}
              activeOpacity={0.7}
            >
              <Text style={styles.modalResetBtnText}>Clear All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalApplyBtn}
              onPress={() => setIsFilterModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalApplyBtnText}>
                Apply ({processedProducts.length} Items)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Shared Filter & Sort Bar UI
  const renderFilterBarContent = () => (
    <View style={styles.filterBar}>
      <TouchableOpacity
        style={styles.filterBarButton}
        onPress={() => setIsSortModalVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="sort-variant" size={18} color="#0F172A" />
        <Text style={styles.filterBarButtonText} numberOfLines={1}>
          {sortBy === 'price_low_high'
            ? 'Price: Low-High'
            : sortBy === 'price_high_low'
            ? 'Price: High-Low'
            : sortBy === 'rating'
            ? 'Top Rated'
            : 'Sort'}
        </Text>
      </TouchableOpacity>

      <View style={styles.filterDivider} />

      <TouchableOpacity
        style={styles.filterBarButton}
        onPress={() => setIsFilterModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="options-outline" size={17} color="#0F172A" />
        <Text style={styles.filterBarButtonText}>Filter</Text>
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {activeFilterCount > 0 && (
        <>
          <View style={styles.filterDivider} />
          <TouchableOpacity
            style={styles.clearBarButton}
            onPress={handleClearAllFilters}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={15} color="#DC2626" />
            <Text style={styles.clearBarButtonText}>Clear</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <MainHeader
        scrollY={scrollY}
        hideCategories={true}
        onHeaderLayout={setHeaderHeight}
        refreshKey={refreshKey}
        disableSticky={true}
      />

      <View style={styles.contentWrapper}>
        <PremiumRefreshWrapper
          scrollY={scrollY}
          refreshing={refreshing}
          onRefresh={onRefresh}
        >
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            stickyHeaderIndices={[1]}
          >
            {/* ── 0. Header Spacer (allows MainHeader to scroll away) ── */}
            <View pointerEvents="none" style={{ height: Math.max(0, headerHeight - insets.top) }} />

            {/* ── 1. Sticky Filter & Sort Bar (Sticks below status bar when scrolling) ── */}
            <View style={[styles.stickyFilterBarWrap, { paddingTop: insets.top + 2 }]}>
              {renderFilterBarContent()}
            </View>

          {/* ── 2. Active Brand Prioritization Banner ── */}
          {selectedBrandId && (
            <View style={styles.activeBrandBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Ionicons name="pricetag-outline" size={14} color="#0F172A" />
                <Text style={styles.activeBrandBannerText} numberOfLines={1}>
                  Showing <Text style={{ fontWeight: '800', color: '#0F172A' }}>{activeBrandName}</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedBrandId(null);
                  setSelectedBrandName(null);
                }}
                style={styles.clearBrandChip}
                activeOpacity={0.7}
              >
                <Text style={styles.clearBrandChipText}>Clear</Text>
                <Ionicons name="close" size={13} color="#475569" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── 3. Brands Available Section (Hidden when navigating with a brand) ── */}
          {!selectedBrandId && connectedWarehouseMerchants.length > 0 && (
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


          {/* ── 5. Express Bestsellers (Only shown when no brand filter is active) ── */}
          {!selectedBrandId && !loading && featuredProducts.length > 0 && (
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
                      product={prod}
                      width={160}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── 6. Products Grid (Prioritized Brand items appear first) ── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  {selectedBrandId ? `${activeBrandName} & Hub Products` : 'All Warehouse Products'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {loading
                    ? 'Fetching live dark store inventory...'
                    : `${processedProducts.length} items available in your location`}
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
            ) : processedProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="cube-outline" size={36} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No Warehouse Products</Text>
                <Text style={styles.emptySub}>
                  No items found matching the current filters. Try clearing your filters!
                </Text>
                <TouchableOpacity
                  style={styles.emptyClearBtn}
                  onPress={handleClearAllFilters}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyClearBtnText}>Clear All Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {processedProducts.map((item, index) => (
                  <View key={item._id || index} style={{ width: CARD_WIDTH, marginBottom: 16 }}>
                    <ProductCard
                      product={item}
                      width={CARD_WIDTH}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── 7. Brand Footer ── */}
          <BrandFooter />

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </PremiumRefreshWrapper>
      </View>

      {/* Modals */}
      {renderSortModal()}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentWrapper: {
    flex: 1,
  },

  /* Filter & Sort Bar */
  stickyFilterBarWrap: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filterBarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterBarButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#0F172A',
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  filterBadge: {
    backgroundColor: '#0F172A',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
  clearBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  clearBarButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#DC2626',
  },

  /* Active Brand Prioritization Banner */
  activeBrandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  activeBrandBannerText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },
  clearBrandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearBrandChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.extraBold,
    color: '#0F172A',
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
    marginBottom: 14,
  },
  emptyClearBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyClearBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  sortOptionText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#334155',
  },
  modalFilterScroll: {
    paddingBottom: 12,
  },
  filterSectionHeading: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 10,
  },
  filterTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
});
