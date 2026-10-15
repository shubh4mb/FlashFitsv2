import { fetchCategories } from '@/api/categories';
import { fetchMerchants } from '@/api/merchants';
import { fetchAvailableSizes, fetchFilteredProducts } from '@/api/products';
import Loader from '@/components/common/Loader';
import ProductCard from '@/components/common/ProductCard';
import ColorFamilySelector from '@/components/common/ColorFilter';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import { COLOR_FAMILIES, POPULAR_COLORS } from '@/utils/colors';
import { ALL_STANDARD_SIZES, SIZE_GROUPS } from '@/utils/sizes';
import { BrandColors, GenderThemes, Typography } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 20;

type SortOption = 'relevance' | 'price_low' | 'price_high' | 'newest' | 'trending';
type DeliveryMode = 'tryAndBuy' | 'courier' | null;

export default function SearchResultsScreen() {
  const { query, q, categoryId, subCategoryId, gender, collectionId, title, merchantId, sortBy: initialSortBy, flashmart, size, sizes } = useLocalSearchParams<{
    query?: string;
    q?: string;
    categoryId?: string;
    subCategoryId?: string;
    gender?: string;
    collectionId?: string;
    title?: string;
    merchantId?: string;
    sortBy?: SortOption;
    flashmart?: string;
    size?: string;
    sizes?: string;
  }>();
  const effectiveQuery = query || q;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedGender } = useGender();
  const { userLocation, selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(insets.top + 180);
  const [topHeaderHeight, setTopHeaderHeight] = useState(insets.top + 62);

  const maxTranslateY = Math.max(topHeaderHeight - insets.top, 0);
  const clampedScroll = useMemo(() => Animated.diffClamp(scrollY, 0, maxTranslateY), [scrollY, maxTranslateY]);
  const headerTranslateY = clampedScroll.interpolate({
    inputRange: [0, maxTranslateY],
    outputRange: [0, -maxTranslateY],
  });

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      handleRefresh();
    }
  };

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sort & Filter States
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy || 'relevance');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(categoryId ? [categoryId] : []);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>(subCategoryId ? [subCategoryId] : []);
  const initialSizes = useMemo(() => {
    if (sizes) return sizes.split(',').map(s => s.trim()).filter(Boolean);
    if (size) return [size.trim()];
    return [];
  }, [size, sizes]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initialSizes);
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
  const initialGender = useMemo(() => {
    if (!gender || gender === 'ALL' || gender === 'UNISEX' || gender === 'KIDS') return '';
    return gender.toUpperCase();
  }, [gender]);
  const [genderFilter, setGenderFilter] = useState<string>(initialGender);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(flashmart === 'true' ? 'tryAndBuy' : null);
  const [collectionFilter, setCollectionFilter] = useState<string | undefined>(collectionId);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(merchantId ? [merchantId] : []);
  const [selectedColorFamily, setSelectedColorFamily] = useState<string>('ALL');
  const [selectedColorHex, setSelectedColorHex] = useState<string>('');

  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Filter Draft States (Staged inside modal until Applied)
  type FilterSection = 'categories' | 'subcategories' | 'size' | 'price' | 'shops' | 'color' | 'collection';
  const [activeFilterSection, setActiveFilterSection] = useState<FilterSection>('categories');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
  const [draftSubCategoryIds, setDraftSubCategoryIds] = useState<string[]>([]);
  const [draftSizes, setDraftSizes] = useState<string[]>(initialSizes);
  const [sizeSearchQuery, setSizeSearchQuery] = useState('');
  const [availableSizes, setAvailableSizes] = useState<string[]>(ALL_STANDARD_SIZES);
  const [draftPriceRange, setDraftPriceRange] = useState<number[]>([0, 10000]);
  const [draftStoreIds, setDraftStoreIds] = useState<string[]>([]);
  const [draftColorFamily, setDraftColorFamily] = useState<string>('ALL');
  const [draftColorHex, setDraftColorHex] = useState<string>('');
  const [draftCollectionFilter, setDraftCollectionFilter] = useState<string | undefined>(undefined);
  const [categories, setCategories] = useState<any[]>([]);
  const [availableMerchants, setAvailableMerchants] = useState<any[]>([]);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');

  // Clear search inputs when modal is closed
  useEffect(() => {
    if (!isFilterModalVisible) {
      setMerchantSearchQuery('');
      setSizeSearchQuery('');
    }
  }, [isFilterModalVisible]);

  // Swipe-to-dismiss gesture handling for modals
  const filterPanY = useRef(new Animated.Value(0)).current;
  const sortPanY = useRef(new Animated.Value(0)).current;

  const filterPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          filterPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 90 || gestureState.vy > 0.6) {
          Animated.timing(filterPanY, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            closeFilterModal();
            filterPanY.setValue(0);
          });
        } else {
          Animated.spring(filterPanY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const sortPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sortPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.6) {
          Animated.timing(sortPanY, {
            toValue: 400,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setIsSortModalVisible(false);
            sortPanY.setValue(0);
          });
        } else {
          Animated.spring(sortPanY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

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

      let colorsToFilter: string[] | undefined = undefined;
      if (selectedColorHex) {
        const matched = COLOR_FAMILIES.flatMap(f => f.colors).find(c => c.hex.toLowerCase() === selectedColorHex.toLowerCase());
        colorsToFilter = matched ? [selectedColorHex, matched.name] : [selectedColorHex];
      } else if (selectedColorFamily && selectedColorFamily.toUpperCase() !== 'ALL') {
        const famData = COLOR_FAMILIES.find(f => f.family.toUpperCase() === selectedColorFamily.toUpperCase());
        if (famData) {
          colorsToFilter = [...famData.colors.map(c => c.hex), ...famData.colors.map(c => c.name)];
        }
      }

      const response = await fetchFilteredProducts({
        search: effectiveQuery,
        page: pageNum,
        limit: PAGE_SIZE,
        sortBy,
        selectedCategoryIds,
        subCategoryIds: selectedSubCategoryIds.length > 0 ? selectedSubCategoryIds : undefined,
        priceRange: (priceRange[0] !== 0 || priceRange[1] !== 10000) ? priceRange : undefined,
        gender: genderFilter || undefined,
        deliveryMode: deliveryMode,
        collectionId: collectionFilter,
        selectedStores: selectedStoreIds.length > 0 ? selectedStoreIds : undefined,
        selectedColors: colorsToFilter,
        selectedSizes: selectedSizes.length > 0 ? selectedSizes : undefined,
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
  }, [effectiveQuery, sortBy, selectedCategoryIds, selectedSubCategoryIds, selectedSizes, priceRange, genderFilter, deliveryMode, collectionFilter, selectedStoreIds, selectedColorFamily, selectedColorHex, getCoords]);

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
        setCategories(res?.categories || res?.data?.categories || (Array.isArray(res) ? res : []));
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    const loadMerchants = async () => {
      try {
        const { lat, lng } = getCoords();
        const res = await fetchMerchants(lat, lng);
        setAvailableMerchants(res.merchants || res.data?.merchants || []);
      } catch (error) {
        console.error('Failed to load merchants:', error);
      }
    };
    loadCategories();
    loadMerchants();
    const loadSizes = async () => {
      try {
        const backendSizes = await fetchAvailableSizes();
        if (Array.isArray(backendSizes) && backendSizes.length > 0) {
          setAvailableSizes(prev => Array.from(new Set([...prev, ...backendSizes])));
        }
      } catch (error) {
        // Fallback to ALL_STANDARD_SIZES
      }
    };
    loadSizes();
  }, [getCoords]);

  // Auto-select parent category if subCategoryId is passed but categoryId is not
  useEffect(() => {
    if (categories.length > 0 && selectedSubCategoryIds.length > 0 && selectedCategoryIds.length === 0) {
      const parentIds = new Set<string>();
      selectedSubCategoryIds.forEach(subId => {
        const subCat = categories.find(c => c._id === subId);
        if (subCat) {
          const pId = subCat.parentCategory || subCat.parent || subCat.category || subCat.parentId;
          const resolvedPId = typeof pId === 'object' ? pId?._id : pId;
          if (resolvedPId) parentIds.add(resolvedPId.toString());
        }
      });
      if (parentIds.size > 0) {
        setSelectedCategoryIds(Array.from(parentIds));
      }
    }
  }, [categories, selectedSubCategoryIds, selectedCategoryIds.length]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    loadData(page + 1, true);
  };

  // Open filter modal and snapshot active filters to draft state
  const openFilterModal = () => {
    setDraftCategoryIds([...selectedCategoryIds]);
    setDraftSubCategoryIds([...selectedSubCategoryIds]);
    setDraftSizes([...selectedSizes]);
    setDraftPriceRange([...priceRange]);
    setDraftStoreIds([...selectedStoreIds]);
    setDraftColorFamily(selectedColorFamily);
    setDraftColorHex(selectedColorHex);
    setDraftCollectionFilter(collectionFilter);
    setCategorySearchQuery('');
    setMerchantSearchQuery('');
    setSizeSearchQuery('');
    setActiveFilterSection(collectionFilter ? 'collection' : 'categories');
    setIsFilterModalVisible(true);
  };

  const closeFilterModal = () => {
    setCategorySearchQuery('');
    setMerchantSearchQuery('');
    setSizeSearchQuery('');
    setIsFilterModalVisible(false);
  };

  const applyDraftFilters = () => {
    setSelectedCategoryIds(draftCategoryIds);
    setSelectedSubCategoryIds(draftSubCategoryIds);
    setSelectedSizes(draftSizes);
    setPriceRange(draftPriceRange);
    setSelectedStoreIds(draftStoreIds);
    setSelectedColorFamily(draftColorFamily);
    setSelectedColorHex(draftColorHex);
    setCollectionFilter(draftCollectionFilter);
    setIsFilterModalVisible(false);
  };

  const resetDraftFilters = () => {
    setDraftCategoryIds([]);
    setDraftSubCategoryIds([]);
    setDraftSizes([]);
    setDraftPriceRange([0, 10000]);
    setDraftStoreIds([]);
    setDraftColorFamily('ALL');
    setDraftColorHex('');
    setDraftCollectionFilter(undefined);
    setCategorySearchQuery('');
    setMerchantSearchQuery('');
    setSizeSearchQuery('');
  };

  const toggleDraftCategory = (id: string) => {
    setDraftCategoryIds(prev => {
      const isRemoving = prev.includes(id);
      if (isRemoving) {
        // Also remove any subcategories belonging to this deselected category
        setDraftSubCategoryIds(subPrev => subPrev.filter(subId => {
          const subCat = categories.find(c => c._id === subId);
          const pId = subCat?.parentCategory || subCat?.parent || subCat?.category || subCat?.parentId;
          const resolvedPId = typeof pId === 'object' ? pId?._id : pId;
          return resolvedPId?.toString() !== id;
        }));
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  const toggleDraftSubCategory = (id: string) => {
    setDraftSubCategoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleDraftSize = (sizeVal: string) => {
    setDraftSizes(prev =>
      prev.includes(sizeVal) ? prev.filter(s => s !== sizeVal) : [...prev, sizeVal]
    );
  };

  const activeFilterCount = selectedCategoryIds.length + selectedSubCategoryIds.length
    + (genderFilter ? 1 : 0) + (deliveryMode ? 1 : 0)
    + ((priceRange[0] !== 0 || priceRange[1] !== 10000) ? 1 : 0)
    + (collectionFilter ? 1 : 0)
    + selectedStoreIds.length
    + (selectedColorFamily !== 'ALL' || selectedColorHex ? 1 : 0)
    + selectedSizes.length;

  const draftActiveCount = draftCategoryIds.length + draftSubCategoryIds.length
    + ((draftPriceRange[0] !== 0 || draftPriceRange[1] !== 10000) ? 1 : 0)
    + (draftCollectionFilter ? 1 : 0)
    + draftStoreIds.length
    + (draftColorFamily !== 'ALL' || draftColorHex ? 1 : 0)
    + draftSizes.length;

  const hasDraftFilters = draftActiveCount > 0;

  const availableDraftSubCategories = useMemo(() => {
    if (draftCategoryIds.length === 0) return [];
    return categories.filter(cat => {
      const parentId = cat.parentCategory || cat.parent || cat.category || cat.parentId;
      const resolvedId = typeof parentId === 'object' ? parentId?._id : parentId;
      return cat.level === 1 && draftCategoryIds.includes(resolvedId?.toString());
    });
  }, [categories, draftCategoryIds]);

  const availableSubCategories = useMemo(() => {
    if (selectedCategoryIds.length === 0) return [];
    return categories.filter(cat => {
      const parentId = cat.parentCategory || cat.parent || cat.category || cat.parentId;
      const resolvedId = typeof parentId === 'object' ? parentId?._id : parentId;
      return cat.level === 1 && selectedCategoryIds.includes(resolvedId?.toString());
    });
  }, [categories, selectedCategoryIds]);

  const sortLabels: Record<SortOption, string> = {
    relevance: 'Sort',
    trending: 'Trending',
    newest: 'New Arrivals',
    price_low: 'Price: Low → High',
    price_high: 'Price: High → Low',
  };

  const clearAllAppliedFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategoryIds([]);
    setSelectedSubCategoryIds([]);
    setSelectedSizes([]);
    setPriceRange([0, 10000]);
    setSelectedStoreIds([]);
    setSelectedColorFamily('ALL');
    setSelectedColorHex('');
    setCollectionFilter(undefined);
  }, []);

  const appliedFilters = useMemo(() => {
    const items: Array<{ id: string; label: string; onRemove: () => void }> = [];

    // 1. Collection
    if (collectionFilter) {
      items.push({
        id: 'collection',
        label: title || 'Collection',
        onRemove: () => setCollectionFilter(undefined),
      });
    }

    // 2. Price Range
    if (priceRange[0] !== 0 || priceRange[1] !== 10000) {
      let label = `₹${priceRange[0]} - ₹${priceRange[1]}`;
      if (priceRange[0] === 0 && priceRange[1] === 500) label = 'Under ₹500';
      else if (priceRange[0] === 500 && priceRange[1] === 1000) label = '₹500 - ₹1000';
      else if (priceRange[0] === 1000 && priceRange[1] === 2000) label = '₹1000 - ₹2000';
      else if (priceRange[0] === 2000 && priceRange[1] === 10000) label = 'Over ₹2000';

      items.push({
        id: 'price',
        label,
        onRemove: () => setPriceRange([0, 10000]),
      });
    }

    // 3. Categories
    selectedCategoryIds.forEach(id => {
      const cat = categories.find(c => c._id === id);
      items.push({
        id: `cat-${id}`,
        label: cat?.name || 'Category',
        onRemove: () => {
          setSelectedCategoryIds(prev => prev.filter(i => i !== id));
          setSelectedSubCategoryIds(subPrev => subPrev.filter(subId => {
            const subCat = categories.find(c => c._id === subId);
            const pId = subCat?.parentCategory || subCat?.parent || subCat?.category || subCat?.parentId;
            const resolvedPId = typeof pId === 'object' ? pId?._id : pId;
            return resolvedPId?.toString() !== id;
          }));
        },
      });
    });

    // 4. SubCategories
    selectedSubCategoryIds.forEach(id => {
      const subCat = categories.find(c => c._id === id);
      items.push({
        id: `subcat-${id}`,
        label: subCat?.name || 'Sub-Category',
        onRemove: () => setSelectedSubCategoryIds(prev => prev.filter(i => i !== id)),
      });
    });

    // 5. Stores
    selectedStoreIds.forEach(id => {
      const merchant = availableMerchants.find(m => m._id === id);
      items.push({
        id: `store-${id}`,
        label: merchant?.shopName || 'Shop',
        onRemove: () => setSelectedStoreIds(prev => prev.filter(i => i !== id)),
      });
    });

    // 6. Colors
    if (selectedColorHex) {
      const matched = COLOR_FAMILIES.flatMap(f => f.colors).find(c => c.hex.toLowerCase() === selectedColorHex.toLowerCase());
      items.push({
        id: 'color-hex',
        label: matched?.name ? `Color: ${matched.name}` : `Color: ${selectedColorHex}`,
        onRemove: () => setSelectedColorHex(''),
      });
    } else if (selectedColorFamily && selectedColorFamily.toUpperCase() !== 'ALL') {
      items.push({
        id: 'color-fam',
        label: `Color: ${selectedColorFamily}`,
        onRemove: () => setSelectedColorFamily('ALL'),
      });
    }

    // 7. Sizes
    selectedSizes.forEach(s => {
      items.push({
        id: `size-${s}`,
        label: `Size: ${s}`,
        onRemove: () => setSelectedSizes(prev => prev.filter(item => item !== s)),
      });
    });

    return items;
  }, [collectionFilter, title, priceRange, selectedCategoryIds, selectedSubCategoryIds, selectedSizes, categories, selectedStoreIds, availableMerchants, selectedColorHex, selectedColorFamily]);

  const topLevelCategories = useMemo(() => {
    return categories.filter(cat => cat.level !== 1);
  }, [categories]);

  const renderProduct = useCallback(({ item }: { item: any }) => (
    <View style={{ width: (width - 48) / 2 }}>
      <ProductCard
        product={item}
        containerStyle={styles.productCard}
        width={(width - 48) / 2}
        fromExplore={deliveryMode !== 'tryAndBuy'}
        fromStore={!!merchantId}
        isNearby={deliveryMode === 'tryAndBuy' || item.isInstantBuyable || item.isNearby}
        isOnline={merchantId ? item.isOnline : (deliveryMode === 'tryAndBuy' ? item.isOnline : true)}
      />
    </View>
  ), [deliveryMode, merchantId]);

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
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ translateY: sortPanY }] }
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View {...sortPanResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.modalHandle} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort By</Text>
            <TouchableOpacity
              onPress={() => setIsSortModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {([
            { key: 'relevance', label: 'Relevance' },
            { key: 'trending', label: 'Popularity' },
            { key: 'newest', label: 'New Arrivals' },
            { key: 'price_low', label: 'Price: Low to High' },
            { key: 'price_high', label: 'Price: High to Low' },
          ] as { key: SortOption; label: string }[]).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={styles.sortOption}
              onPress={() => {
                Haptics.selectionAsync();
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
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  const renderFilterModal = () => {
    const filterTabs: Array<{ id: FilterSection; label: string; count: number }> = [
      ...(draftCollectionFilter ? [{ id: 'collection' as FilterSection, label: 'Collection', count: 1 }] : []),
      { id: 'categories', label: 'Categories', count: draftCategoryIds.length },
      { id: 'subcategories', label: 'Sub-Categories', count: draftSubCategoryIds.length },
      { id: 'size', label: 'Size', count: draftSizes.length },
      { id: 'price', label: 'Price', count: (draftPriceRange[0] !== 0 || draftPriceRange[1] !== 10000) ? 1 : 0 },
      ...(availableMerchants.length > 0 ? [{ id: 'shops' as FilterSection, label: 'Shops', count: draftStoreIds.length }] : []),
      { id: 'color', label: 'Color', count: (draftColorFamily !== 'ALL' || !!draftColorHex) ? 1 : 0 },
    ];

    const filteredCategories = topLevelCategories.filter(cat =>
      !categorySearchQuery.trim() || cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );

    const filteredMerchants = availableMerchants.filter(m => {
      const s = merchantSearchQuery.toLowerCase();
      const city = m.address?.city || m.city || (typeof m.address === 'string' ? m.address : '');
      const area = m.address?.area || '';
      return m.shopName.toLowerCase().includes(s) ||
        city.toLowerCase().includes(s) ||
        area.toLowerCase().includes(s);
    });

    return (
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeFilterModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeFilterModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <Animated.View
              style={[
                styles.modalContent,
                { height: '82%', maxHeight: 720 },
                { transform: [{ translateY: filterPanY }] },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View {...filterPanResponder.panHandlers} style={styles.dragHandleArea}>
                <View style={styles.modalHandle} />
              </View>
              <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>Filters</Text>
                {draftActiveCount > 0 && (
                  <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.filterBadgeText}>{draftActiveCount}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={closeFilterModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Master-Detail Dual-Pane Body */}
            <View style={styles.masterDetailContainer}>
              {/* Left Sidebar */}
              <View style={styles.filterSidebar}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {filterTabs.map((tab) => {
                    const isActive = activeFilterSection === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        style={[styles.sidebarTab, isActive && styles.sidebarTabActive]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setActiveFilterSection(tab.id);
                        }}
                        activeOpacity={0.8}
                      >
                        {isActive && <View style={[styles.sidebarIndicator, { backgroundColor: theme.primary }]} />}
                        <Text
                          style={[
                            styles.sidebarTabText,
                            isActive && { color: theme.primary, fontFamily: Typography.fontFamily.bold }
                          ]}
                          numberOfLines={1}
                        >
                          {tab.label}
                        </Text>
                        {tab.count > 0 && (
                          <View style={[styles.sidebarBadge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.sidebarBadgeText}>{tab.count}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Right Detail Pane */}
              <View style={styles.filterDetailPane}>
                {/* 1. Collection Detail */}
                {activeFilterSection === 'collection' && draftCollectionFilter && (
                  <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.collectionCard}>
                      <Ionicons name="sparkles" size={22} color={theme.primary} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.collectionTitle}>{title || 'Curated Collection'}</Text>
                        <Text style={styles.collectionSubtitle}>Currently browsing this collection</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.collectionRemoveBtn}
                        onPress={() => setDraftCollectionFilter(undefined)}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                )}

                {/* 2. Categories Detail */}
                {activeFilterSection === 'categories' && (
                  <View style={{ flex: 1 }}>
                    <View style={styles.sectionSearchContainer}>
                      <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.sectionSearchInput}
                        placeholder="Search categories..."
                        value={categorySearchQuery}
                        onChangeText={setCategorySearchQuery}
                        placeholderTextColor="#94A3B8"
                      />
                      {categorySearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((cat) => {
                          const isSelected = draftCategoryIds.includes(cat._id);
                          return (
                            <TouchableOpacity
                              key={cat._id}
                              style={[styles.filterRowItem, isSelected && styles.filterRowItemActive]}
                              onPress={() => {
                                Haptics.selectionAsync();
                                toggleDraftCategory(cat._id);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.checkboxBox, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                                {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                              </View>
                              <Text style={[styles.filterRowText, isSelected && { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <View style={styles.emptyDetailContainer}>
                          <Text style={styles.emptyDetailText}>No categories found</Text>
                        </View>
                      )}
                      <View style={{ height: 20 }} />
                    </ScrollView>
                  </View>
                )}

                {/* 3. Sub-Categories Detail */}
                {activeFilterSection === 'subcategories' && (
                  <View style={{ flex: 1 }}>
                    {availableDraftSubCategories.length > 0 ? (
                      <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                        {availableDraftSubCategories.map((cat) => {
                          const isSelected = draftSubCategoryIds.includes(cat._id);
                          return (
                            <TouchableOpacity
                              key={cat._id}
                              style={[styles.filterRowItem, isSelected && styles.filterRowItemActive]}
                              onPress={() => {
                                Haptics.selectionAsync();
                                toggleDraftSubCategory(cat._id);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.checkboxBox, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                                {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                              </View>
                              <Text style={[styles.filterRowText, isSelected && { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        <View style={{ height: 20 }} />
                      </ScrollView>
                    ) : (
                      <View style={styles.emptyDetailContainer}>
                        <Ionicons name="layers-outline" size={38} color="#CBD5E1" />
                        <Text style={styles.emptyDetailTitle}>No Sub-Categories</Text>
                        <Text style={styles.emptyDetailText}>
                          Select a category first to view its available sub-categories.
                        </Text>
                        <TouchableOpacity
                          style={[styles.emptyDetailAction, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
                          onPress={() => setActiveFilterSection('categories')}
                        >
                          <Text style={[styles.emptyDetailActionText, { color: theme.primary }]}>Select Categories</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* 3.5. Size Detail */}
                {activeFilterSection === 'size' && (
                  <View style={{ flex: 1 }}>
                    <View style={styles.sectionSearchContainer}>
                      <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.sectionSearchInput}
                        placeholder="Search size (e.g. M, 32, XL)..."
                        value={sizeSearchQuery}
                        onChangeText={setSizeSearchQuery}
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                      />
                      {sizeSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSizeSearchQuery('')}>
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                      {draftSizes.length > 0 && (
                        <View style={styles.selectedSizesBanner}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: 6 }}>
                            <Text style={styles.selectedSizesBannerLabel}>Selected ({draftSizes.length}):</Text>
                            {draftSizes.map(sz => (
                              <TouchableOpacity
                                key={sz}
                                style={[styles.selectedMiniBadge, { backgroundColor: theme.primary }]}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  toggleDraftSize(sz);
                                }}
                              >
                                <Text style={styles.selectedMiniBadgeText}>{sz}</Text>
                                <Ionicons name="close" size={12} color="#FFFFFF" style={{ marginLeft: 3 }} />
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setDraftSizes([]);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.clearSelectedSizesText}>Clear</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {sizeSearchQuery.trim().length > 0 ? (
                        (() => {
                          const q = sizeSearchQuery.trim().toUpperCase();
                          const filtered = availableSizes.filter(s => s.toUpperCase().includes(q));
                          const exactMatch = availableSizes.some(s => s.toUpperCase() === q);
                          return (
                            <View>
                              {filtered.length > 0 && (
                                <View style={styles.sizeChipsGrid}>
                                  {filtered.map(s => {
                                    const isSelected = draftSizes.includes(s);
                                    return (
                                      <TouchableOpacity
                                        key={s}
                                        style={[
                                          styles.sizeChipButton,
                                          isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                                        ]}
                                        onPress={() => {
                                          Haptics.selectionAsync();
                                          toggleDraftSize(s);
                                        }}
                                        activeOpacity={0.7}
                                      >
                                        <Text style={[
                                          styles.sizeChipButtonText,
                                          isSelected && styles.sizeChipButtonTextSelected
                                        ]}>
                                          {s}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              )}

                              {!exactMatch && q.length > 0 && (
                                <TouchableOpacity
                                  style={[styles.customSizeOption, { borderColor: theme.primary + '40', backgroundColor: theme.primary + '10' }]}
                                  onPress={() => {
                                    Haptics.selectionAsync();
                                    if (!availableSizes.includes(q)) {
                                      setAvailableSizes(prev => [...prev, q]);
                                    }
                                    toggleDraftSize(q);
                                    setSizeSearchQuery('');
                                  }}
                                >
                                  <Ionicons name="add-circle" size={18} color={theme.primary} />
                                  <Text style={[styles.customSizeOptionText, { color: theme.primary }]}>
                                    Select "{q}"
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {filtered.length === 0 && !exactMatch && (
                                <View style={styles.emptyDetailContainer}>
                                  <Text style={styles.emptyDetailText}>No standard sizes match "{sizeSearchQuery}"</Text>
                                </View>
                              )}
                            </View>
                          );
                        })()
                      ) : (
                        <>
                          {SIZE_GROUPS.map((group) => (
                            <View key={group.id} style={{ marginBottom: 16 }}>
                              <Text style={styles.sizeSectionHeader}>{group.label}</Text>
                              <View style={styles.sizeChipsGrid}>
                                {group.sizes.map((s) => {
                                  const isSelected = draftSizes.includes(s);
                                  return (
                                    <TouchableOpacity
                                      key={s}
                                      style={[
                                        styles.sizeChipButton,
                                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                                      ]}
                                      onPress={() => {
                                        Haptics.selectionAsync();
                                        toggleDraftSize(s);
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={[
                                        styles.sizeChipButtonText,
                                        isSelected && styles.sizeChipButtonTextSelected
                                      ]}>
                                        {s}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          ))}

                          {(() => {
                            const standardSet = new Set(ALL_STANDARD_SIZES.map(s => s.toUpperCase()));
                            const otherSizes = availableSizes.filter(s => !standardSet.has(s.toUpperCase()));
                            if (otherSizes.length === 0) return null;
                            return (
                              <View style={{ marginBottom: 16 }}>
                                <Text style={styles.sizeSectionHeader}>Other Sizes</Text>
                                <View style={styles.sizeChipsGrid}>
                                  {otherSizes.map((s) => {
                                    const isSelected = draftSizes.includes(s);
                                    return (
                                      <TouchableOpacity
                                        key={s}
                                        style={[
                                          styles.sizeChipButton,
                                          isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                                        ]}
                                        onPress={() => {
                                          Haptics.selectionAsync();
                                          toggleDraftSize(s);
                                        }}
                                        activeOpacity={0.7}
                                      >
                                        <Text style={[
                                          styles.sizeChipButtonText,
                                          isSelected && styles.sizeChipButtonTextSelected
                                        ]}>
                                          {s}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </View>
                            );
                          })()}
                        </>
                      )}
                      <View style={{ height: 20 }} />
                    </ScrollView>
                  </View>
                )}

                {/* 4. Price Detail */}
                {activeFilterSection === 'price' && (
                  <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                    {[
                      { label: 'All', range: [0, 10000] },
                      { label: 'Under ₹500', range: [0, 500] },
                      { label: '₹500 - ₹1000', range: [500, 1000] },
                      { label: '₹1000 - ₹2000', range: [1000, 2000] },
                      { label: 'Over ₹2000', range: [2000, 10000] },
                    ].map(({ label, range }) => {
                      const isSelected = draftPriceRange[0] === range[0] && draftPriceRange[1] === range[1];
                      return (
                        <TouchableOpacity
                          key={label}
                          style={[styles.filterRowItem, isSelected && styles.filterRowItemActive]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setDraftPriceRange(range);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.radioCircle, isSelected && { borderColor: theme.primary }]}>
                            {isSelected && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
                          </View>
                          <Text style={[styles.filterRowText, isSelected && { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                )}

                {/* 5. Shops Detail */}
                {activeFilterSection === 'shops' && (
                  <View style={{ flex: 1 }}>
                    <View style={styles.sectionSearchContainer}>
                      <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.sectionSearchInput}
                        placeholder="Search shops..."
                        value={merchantSearchQuery}
                        onChangeText={setMerchantSearchQuery}
                        placeholderTextColor="#94A3B8"
                      />
                      {merchantSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setMerchantSearchQuery('')}>
                          <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                      {filteredMerchants.length > 0 ? (
                        filteredMerchants.map((merchant) => {
                          const isSelected = draftStoreIds.includes(merchant._id);
                          const location = merchant.address?.city || merchant.address?.area || '';
                          return (
                            <TouchableOpacity
                              key={merchant._id}
                              style={[styles.filterRowItem, isSelected && styles.filterRowItemActive]}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setDraftStoreIds(prev =>
                                  prev.includes(merchant._id) ? prev.filter(id => id !== merchant._id) : [...prev, merchant._id]
                                );
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.checkboxBox, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                                {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.filterRowText, isSelected && { color: theme.primary, fontFamily: Typography.fontFamily.bold }]}>
                                  {merchant.shopName}
                                </Text>
                                {location ? (
                                  <Text style={styles.shopLocationSubtext}>{location}</Text>
                                ) : null}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <View style={styles.emptyDetailContainer}>
                          <Text style={styles.emptyDetailText}>No shops found</Text>
                        </View>
                      )}
                      <View style={{ height: 20 }} />
                    </ScrollView>
                  </View>
                )}

                {/* 6. Color Detail */}
                {activeFilterSection === 'color' && (
                  <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.colorGroupHeader}>Color Family</Text>
                    <ColorFamilySelector 
                      selectedFamily={draftColorFamily}
                      onSelectFamily={(fam) => {
                        Haptics.selectionAsync();
                        setDraftColorFamily(fam);
                        setDraftColorHex('');
                      }}
                      showAllOption={true}
                    />

                    {draftColorFamily.toUpperCase() !== 'ALL' && (
                      <>
                        <Text style={[styles.colorGroupHeader, { marginTop: 20 }]}>Specific Shade</Text>
                        <View style={styles.colorSwatchesContainer}>
                          {(COLOR_FAMILIES.find((f) => f.family.toUpperCase() === draftColorFamily.toUpperCase())?.colors || [])
                            .map((c) => {
                              const isSelected = draftColorHex === c.hex;
                              return (
                                <TouchableOpacity
                                  key={`${c.name}_${c.hex}`}
                                  style={styles.colorSwatchItem}
                                  onPress={() => {
                                    Haptics.selectionAsync();
                                    setDraftColorHex(isSelected ? '' : c.hex);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <View 
                                    style={[
                                      styles.colorSwatchCircle,
                                      { 
                                        backgroundColor: c.hex,
                                        borderWidth: c.hex.toLowerCase() === '#ffffff' ? 1 : (isSelected ? 2 : 0),
                                        borderColor: isSelected ? theme.primary : '#CBD5E1',
                                      }
                                    ]} 
                                  >
                                    {isSelected && (
                                      <Ionicons
                                        name="checkmark"
                                        size={14}
                                        color={c.hex.toLowerCase() === '#ffffff' ? theme.primary : '#FFFFFF'}
                                      />
                                    )}
                                  </View>
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.colorSwatchName,
                                      isSelected && { color: theme.primary, fontFamily: Typography.fontFamily.bold }
                                    ]}
                                  >
                                    {c.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                          })}
                        </View>
                      </>
                    )}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.filterFooter}>
              <TouchableOpacity
                style={[styles.resetButton, !hasDraftFilters && { opacity: 0.4 }]}
                disabled={!hasDraftFilters}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  resetDraftFilters();
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  applyDraftFilters();
                }}
              >
                <Text style={styles.applyButtonText}>
                  {draftActiveCount > 0 ? `Apply Filters (${draftActiveCount})` : 'Apply Filters'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Mask for Status Bar to prevent text overlapping when scrolling up */}
      <View style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, 
        height: insets.top, 
        backgroundColor: '#FFFFFF', 
        zIndex: 1000 
      }} />

      {/* Collapsible Header Section */}
      <Animated.View
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        style={[
          styles.animatedHeaderContainer,
          { transform: [{ translateY: headerTranslateY }] }
        ]}
      >
        {/* Header */}
        <View 
          onLayout={(e) => setTopHeaderHeight(e.nativeEvent.layout.height)}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerLabel}>{collectionFilter ? 'Curated Collection' : 'Search results for'}</Text>
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
            <MaterialCommunityIcons
              name="sort-variant"
              size={20}
              color={sortBy !== 'relevance' ? theme.primary : '#475569'}
            />
            <Text
              style={[
                styles.filterBarButtonText,
                sortBy !== 'relevance' && { color: theme.primary, fontFamily: Typography.fontFamily.bold }
              ]}
              numberOfLines={1}
            >
              {sortLabels[sortBy] || 'Sort'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={sortBy !== 'relevance' ? theme.primary : '#94A3B8'}
            />
          </TouchableOpacity>

          <View style={styles.filterDivider} />

          <TouchableOpacity
            style={styles.filterBarButton}
            onPress={openFilterModal}
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
            {['ALL', 'MEN', 'WOMEN', 'BOYS', 'GIRLS'].map((g) => {
              const isSelected = (g === 'ALL' && !genderFilter) || genderFilter === g;
              const label = g === 'ALL' ? 'All' : 
                            g === 'MEN' ? 'Men' : 
                            g === 'WOMEN' ? 'Women' : 
                            g === 'BOYS' ? 'Boys' : 'Girls';
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

        {/* Applied Filters Quick-Dismiss Row */}
        {appliedFilters.length > 0 && (
          <View style={styles.appliedFiltersRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.appliedFiltersScroll}
            >
              {appliedFilters.map(filter => (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.appliedFilterChip, { borderColor: theme.primary + '35', backgroundColor: theme.primary + '10' }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    filter.onRemove();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.appliedFilterChipText, { color: theme.primary }]}>
                    {filter.label}
                  </Text>
                  <Ionicons name="close" size={14} color={theme.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}

              {appliedFilters.length > 1 && (
                <TouchableOpacity
                  style={styles.clearAllChip}
                  onPress={clearAllAppliedFilters}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearAllChipText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Results count */}
        {!loading && (
          <View style={styles.resultsCountBar}>
            <Text style={styles.resultsCountText}>{totalCount} {totalCount === 1 ? 'product' : 'products'} found</Text>
          </View>
        )}
      </Animated.View>

      {loading ? (
        <View style={styles.centered}>
          <Loader size={60} />
        </View>
      ) : products.length > 0 ? (
        <PremiumRefreshWrapper
          scrollY={scrollY}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        >
          <Animated.FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item: any, index: number) => `${item._id || index}-${item.variantId || index}`}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={[styles.listContent, { paddingTop: headerHeight }]}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={15}
            ListFooterComponent={renderFooter}
          />
        </PremiumRefreshWrapper>
      ) : (
        <View style={styles.centered}>
          {(genderFilter === 'BOYS' || genderFilter === 'GIRLS') ? (
            <>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="sparkles" size={36} color={BrandColors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{genderFilter === 'BOYS' ? 'Boys Fits Dropping Soon' : 'Girls Fits Dropping Soon'}</Text>
              <Text style={styles.emptyText}>We're curating active styles and onboarding partners like E_kid. Coming soon!</Text>
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: '#0F172A', marginTop: 16 }]}
                onPress={() => setGenderFilter('')}
              >
                <Text style={styles.clearFiltersButtonText}>View All Collections</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="search-outline" size={80} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters or search for something else</Text>
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
                onPress={clearAllAppliedFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Floating Bolt Toggle */}
      <View style={[styles.floatingToggleContainer, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setDeliveryMode(deliveryMode === 'tryAndBuy' ? null : 'tryAndBuy');
          }}
          style={styles.floatingButtonWrapper}
        >
          {/* Outer Glow Ring for Active State */}
          {deliveryMode === 'tryAndBuy' && (
            <View style={[styles.pulseRing, { borderColor: theme.primary + '40' }]} />
          )}

          <LinearGradient
            colors={deliveryMode === 'tryAndBuy' ? [theme.primary, theme.primary, theme.primary + 'CC'] : ['#FFFFFF', '#F8FAFC']}
            style={[
              styles.floatingBolt,
              deliveryMode !== 'tryAndBuy' && styles.floatingBoltInactive
            ]}
          >
            <Ionicons
              name={deliveryMode === 'tryAndBuy' ? "flash" : "flash-outline"}
              size={32}
              color={deliveryMode === 'tryAndBuy' ? '#FFFFFF' : '#94A3B8'}
            />
          </LinearGradient>

          {deliveryMode === 'tryAndBuy' && (
            <View style={[styles.activeIndicator, { backgroundColor: '#10B981' }]} />
          )}
        </TouchableOpacity>

        <View style={[
          styles.floatingLabelContainer,
          deliveryMode === 'tryAndBuy' && { backgroundColor: theme.primary, borderColor: theme.primary }
        ]}>
          <Text style={[
            styles.floatingLabel,
            deliveryMode === 'tryAndBuy' && { color: '#FFFFFF' }
          ]}>
            {deliveryMode === 'tryAndBuy' ? 'TRY & BUY: ON' : 'TRY & BUY: OFF'}
          </Text>
        </View>
      </View>

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
  },
  animatedHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
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
  dragHandleArea: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  masterDetailContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  filterSidebar: {
    width: 126,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  sidebarTab: {
    position: 'relative',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    justifyContent: 'center',
  },
  sidebarTabActive: {
    backgroundColor: '#FFFFFF',
  },
  sidebarIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
  },
  sidebarTabText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  sidebarBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
  },
  sidebarBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
  },
  filterDetailPane: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  detailScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.medium,
    paddingVertical: 8,
  },
  filterRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  filterRowItemActive: {
    backgroundColor: 'transparent',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterRowText: {
    fontSize: 14,
    color: '#334155',
    fontFamily: Typography.fontFamily.medium,
  },
  shopLocationSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
  emptyDetailContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 30,
  },
  emptyDetailTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDetailText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 18,
  },
  emptyDetailAction: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyDetailActionText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  collectionTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  collectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
    marginTop: 2,
  },
  collectionRemoveBtn: {
    padding: 4,
  },
  colorGroupHeader: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 10,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorSwatchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
  },
  colorSwatchItem: {
    alignItems: 'center',
    width: 52,
  },
  colorSwatchCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  colorSwatchName: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
    textAlign: 'center',
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
  floatingToggleContainer: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  floatingButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBolt: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
  },
  floatingBoltInactive: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  activeIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 1001,
  },
  floatingLabelContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
    letterSpacing: 1.5,
  },
  modeToggleContainer: {
    display: 'none',
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
  appliedFiltersRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  appliedFiltersScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  appliedFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  appliedFilterChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
  },
  clearAllChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  clearAllChipText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Typography.fontFamily.bold,
  },
  shopFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  merchantSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginLeft: 16,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  merchantSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: Typography.fontFamily.medium,
    paddingVertical: 8,
  },
  shopTagContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopLocationText: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
    marginTop: 1,
  },
  selectedSizesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  selectedSizesBannerLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
    marginRight: 4,
  },
  selectedMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  selectedMiniBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
  },
  clearSelectedSizesText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    marginLeft: 8,
  },
  sizeSectionHeader: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sizeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChipButton: {
    minWidth: 52,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#334155',
  },
  sizeChipButtonTextSelected: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },
  customSizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  customSizeOptionText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
});
