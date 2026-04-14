import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  Text,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchFilteredProducts } from '@/api/products';
import { fetchCategories } from '@/api/categories';
import ProductCard from '@/components/common/ProductCard';
import { useGender } from '@/context/GenderContext';
import { useAddress } from '@/context/AddressContext';
import { GenderThemes, Typography } from '@/constants/theme';
import Loader from '@/components/common/Loader';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 20;

type SortOption = 'relevance' | 'price_low' | 'price_high' | 'newest';
type DeliveryMode = 'tryAndBuy' | 'courier' | null;

export default function SearchResultsScreen() {
  const { query, categoryId, subCategoryId, gender, collectionId, title } = useLocalSearchParams<{ 
    query?: string; 
    categoryId?: string; 
    subCategoryId?: string; 
    gender?: string;
    collectionId?: string;
    title?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sort & Filter States
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(categoryId ? [categoryId] : []);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>(subCategoryId ? [subCategoryId] : []);
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
  const [genderFilter, setGenderFilter] = useState<string>(gender || '');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | undefined>(collectionId);
  
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Track if filters changed to reset pagination
  const isFirstLoad = useRef(true);

  const getCoords = useCallback(() => {
    const lat = selectedAddress?.location?.coordinates?.[1] ?? userLocation?.latitude;
    const lng = selectedAddress?.location?.coordinates?.[0] ?? userLocation?.longitude;
    return { lat, lng };
  }, [selectedAddress, userLocation]);

  const loadData = useCallback(async (pageNum: number, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const { lat, lng } = getCoords();

      const response = await fetchFilteredProducts({
        search: query,
        page: pageNum,
        limit: PAGE_SIZE,
        sortBy,
        selectedCategoryIds,
        subCategoryIds: selectedSubCategoryIds.length > 0 ? selectedSubCategoryIds : undefined,
        priceRange: (priceRange[0] !== 0 || priceRange[1] !== 10000) ? priceRange : undefined,
        gender: genderFilter || undefined,
        deliveryMode: deliveryMode,
        collectionId: collectionFilter,
        lat,
        lng,
      });

      const newProducts = response.products || [];
      setProducts(prev => append ? [...prev, ...newProducts] : newProducts);
      setTotalCount(response.totalCount || 0);
      setTotalPages(response.totalPages || 1);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch search results:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [query, sortBy, selectedCategoryIds, selectedSubCategoryIds, priceRange, genderFilter, deliveryMode, collectionFilter, getCoords]);

  // Reload from page 1 when filters change
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
    }
    loadData(1, false);
  }, [loadData]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchCategories();
        setCategories(res.categories || []);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    loadData(page + 1, true);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSubCategory = (id: string) => {
    setSelectedSubCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const activeFilterCount = selectedCategoryIds.length + selectedSubCategoryIds.length 
    + (genderFilter ? 1 : 0) + (deliveryMode ? 1 : 0) 
    + ((priceRange[0] !== 0 || priceRange[1] !== 10000) ? 1 : 0)
    + (collectionFilter ? 1 : 0);

  const availableSubCategories = useMemo(() => {
    if (selectedCategoryIds.length === 0) return [];
    return categories.filter(cat => {
      const parentId = cat.parentCategory || cat.parent || cat.category || cat.parentId;
      const resolvedId = typeof parentId === 'object' ? parentId?._id : parentId;
      return cat.level === 1 && selectedCategoryIds.includes(resolvedId?.toString());
    });
  }, [categories, selectedCategoryIds]);

  const topLevelCategories = useMemo(() => {
    return categories.filter(cat => cat.level !== 1);
  }, [categories]);

  // ── Footer component for FlatList ──
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

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
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>
          
          {([
            { key: 'relevance', label: 'Relevance' },
            { key: 'price_low', label: 'Price: Low to High' },
            { key: 'price_high', label: 'Price: High to Low' },
            { key: 'newest', label: 'New Arrivals' },
          ] as { key: SortOption; label: string }[]).map(({ key, label }) => (
            <TouchableOpacity 
              key={key}
              style={styles.sortOption}
              onPress={() => {
                setSortBy(key);
                setIsSortModalVisible(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === key && { color: theme.primary, fontFamily: Typography.fontFamily.bold }
              ]}>
                {label}
              </Text>
              {sortBy === key && <Ionicons name="checkmark" size={20} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
        <View style={[styles.modalContent, { height: '80%' }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
            {/* Collection Filter (if active) */}
            {collectionFilter && (
              <>
                <Text style={styles.filterSectionTitle}>Collection</Text>
                <View style={styles.categoryFilterContainer}>
                  <TouchableOpacity
                    style={[styles.filterTag, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => setCollectionFilter(undefined)}
                  >
                    <Text style={[styles.filterTagText, { color: '#FFFFFF' }]}>{title || 'Collection'}  ✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 24 }} />
              </>
            )}

            {/* Delivery Mode */}
            <Text style={styles.filterSectionTitle}>Delivery</Text>
            <View style={styles.deliveryFilterContainer}>
              <TouchableOpacity
                style={[styles.deliveryTag, deliveryMode === 'tryAndBuy' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setDeliveryMode(prev => prev === 'tryAndBuy' ? null : 'tryAndBuy')}
              >
                <Ionicons name="storefront-outline" size={16} color={deliveryMode === 'tryAndBuy' ? '#FFF' : '#475569'} style={{ marginRight: 6 }} />
                <Text style={[styles.deliveryTagText, deliveryMode === 'tryAndBuy' && { color: '#FFFFFF' }]}>Try & Buy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deliveryTag, deliveryMode === 'courier' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setDeliveryMode(prev => prev === 'courier' ? null : 'courier')}
              >
                <Ionicons name="bicycle-outline" size={16} color={deliveryMode === 'courier' ? '#FFF' : '#475569'} style={{ marginRight: 6 }} />
                <Text style={[styles.deliveryTagText, deliveryMode === 'courier' && { color: '#FFFFFF' }]}>Courier</Text>
              </TouchableOpacity>
            </View>

            {/* Gender removed from here as it's now outside */}

            {/* Categories */}
            <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Categories</Text>
            <View style={styles.categoryFilterContainer}>
              {topLevelCategories.slice(0, 15).map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat._id);
                return (
                  <TouchableOpacity
                    key={cat._id}
                    style={[styles.filterTag, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => toggleCategory(cat._id)}
                  >
                    <Text style={[styles.filterTagText, isSelected && { color: '#FFFFFF' }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sub-Categories */}
            {availableSubCategories.length > 0 && (
              <>
                <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Sub-Categories</Text>
                <View style={styles.categoryFilterContainer}>
                  {availableSubCategories.map((cat) => {
                    const isSelected = selectedSubCategoryIds.includes(cat._id);
                    return (
                      <TouchableOpacity
                        key={cat._id}
                        style={[styles.filterTag, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                        onPress={() => toggleSubCategory(cat._id)}
                      >
                        <Text style={[styles.filterTagText, isSelected && { color: '#FFFFFF' }]}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Price Range */}
            <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Price Range</Text>
            <View style={styles.categoryFilterContainer}>
              {[
                { label: 'All', range: [0, 10000] },
                { label: 'Under ₹500', range: [0, 500] },
                { label: '₹500 - ₹1000', range: [500, 1000] },
                { label: '₹1000 - ₹2000', range: [1000, 2000] },
                { label: 'Over ₹2000', range: [2000, 10000] },
              ].map(({ label, range }) => {
                const isSelected = priceRange[0] === range[0] && priceRange[1] === range[1];
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.filterTag, isSelected && { backgroundColor: '#0F172A', borderColor: '#0F172A' }]}
                    onPress={() => setPriceRange(range)}
                  >
                    <Text style={[styles.filterTagText, isSelected && { color: '#FFFFFF', fontFamily: Typography.fontFamily.bold }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          <View style={styles.filterFooter}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => {
                setSelectedCategoryIds([]);
                setSelectedSubCategoryIds([]);
                setPriceRange([0, 10000]);
                setGenderFilter('');
                setDeliveryMode(null);
              }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.applyButton, { backgroundColor: theme.primary }]}
              onPress={() => setIsFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerLabel}>Search results for</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || query || (categories.find(c => c._id === categoryId || c._id === subCategoryId)?.name || 'Products')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/search')} style={styles.searchButton}>
          <Ionicons name="search" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={styles.filterBarButton}
          onPress={() => setIsSortModalVisible(true)}
        >
          <MaterialCommunityIcons name="sort-variant" size={20} color="#475569" />
          <Text style={styles.filterBarButtonText}>Sort</Text>
          <Ionicons name="chevron-down" size={14} color="#94A3B8" />
        </TouchableOpacity>
        
        <View style={styles.filterDivider} />
        
        <TouchableOpacity 
          style={styles.filterBarButton}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons name="filter-outline" size={18} color="#475569" />
          <Text style={styles.filterBarButtonText}>Filter</Text>
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Gender Filter Row (Moved Outside) */}
      <View style={styles.genderFilterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genderScrollContent}>
          {['ALL', 'MEN', 'WOMEN', 'KIDS', 'UNISEX'].map((g) => {
            const isSelected = (g === 'ALL' && !genderFilter) || genderFilter === g;
            const label = g === 'ALL' ? 'All' : g === 'MEN' ? 'Men' : g === 'WOMEN' ? 'Women' : g === 'KIDS' ? 'Kids' : 'Unisex';
            return (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderTab, 
                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setGenderFilter(g === 'ALL' ? '' : g)}
              >
                <Text style={[
                  styles.genderTabText, 
                  isSelected && { color: '#FFFFFF', fontFamily: Typography.fontFamily.bold }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results count */}
      {!loading && (
        <View style={styles.resultsCountBar}>
          <Text style={styles.resultsCountText}>{totalCount} {totalCount === 1 ? 'product' : 'products'} found</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <Loader size={60} />
        </View>
      ) : products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={({ item }) => (
            <ProductCard 
              product={item} 
              containerStyle={styles.productCard}
              width={(width - 48) / 2} 
              fromExplore={deliveryMode !== 'tryAndBuy'}
            />
          )}
          keyExtractor={(item, index) => `${item._id || index}-${item.variantId || index}`}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      ) : (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>Try adjusting your filters or search for something else</Text>
          <TouchableOpacity 
            style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              setSelectedCategoryIds([]);
              setSelectedSubCategoryIds([]);
              setPriceRange([0, 10000]);
              setGenderFilter('');
              setDeliveryMode(null);
              setCollectionFilter(undefined);
              setSortBy('relevance');
            }}
          >
            <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderSortModal()}
      {renderFilterModal()}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  headerTitle: {
    fontSize: 16,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.bold,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  filterBarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  filterBarButtonText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: Typography.fontFamily.bold,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
  },
  resultsCountBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  resultsCountText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    marginRight: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.bold,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Typography.fontFamily.medium,
  },
  clearFiltersButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.bold,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#475569',
    fontFamily: Typography.fontFamily.medium,
  },
  filterScroll: {
    padding: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 16,
  },
  deliveryFilterContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  deliveryTag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  deliveryTagText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: Typography.fontFamily.bold,
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  filterTagText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  filterFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resetButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#475569',
    fontFamily: Typography.fontFamily.bold,
  },
  applyButton: {
    flex: 2,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },
  genderFilterRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
  },
  genderScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genderTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  genderTabText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
});
