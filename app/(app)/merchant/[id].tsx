import { fetchMerchantById } from '@/api/merchants';
import { fetchProductsByMerchant, fetchWarehouseProducts } from '@/api/products';
import { getMerchantOffers } from '@/api/offers';
import { Image } from 'expo-image';
import ProductCard from '@/components/common/ProductCard';
import MerchantCollectionBanners from '@/components/sections/MerchantCollectionBanners';
import MerchantCouponCarousel from '@/components/common/MerchantCouponCarousel';
import { GenderThemes, Typography } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useCourierCart } from '@/context/CourierCartContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useGender } from '@/context/GenderContext';
import { useAddress } from '@/context/AddressContext';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Loader from '@/components/common/Loader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const INK = '#0B0B0F';
const MUTED = '#8A8F98';
const LINE = '#ECECEF';
const CANVAS = '#FFFFFF';

const GENDER_ICON_MAP: Record<string, any> = {
  MEN: 'male',
  WOMEN: 'female',
  KIDS: 'happy-outline',
};

export default function MerchantDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, fromExplore, isWarehouse } = useLocalSearchParams<{
    id: string; fromExplore?: string; isWarehouse?: string;
  }>();
  const router = useRouter();

  const { selectedGender, setSelectedGender } = useGender();
  const { selectedAddress, userLocation } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [merchantOffers, setMerchantOffers] = useState<any[]>([]);
  const [localSelectedGender, setLocalSelectedGender] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { cart } = useCart();
  const { courierCart } = useCourierCart();

  const instantCartCount = cart?.merchantCarts?.length || 0;
  const courierCartCount = courierCart?.items?.length || 0;
  const cartCount = instantCartCount + courierCartCount;

  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Header fades in as the hero scrolls away
  const headerOpacity = scrollY.interpolate({
    inputRange: [120, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const heroScale = scrollY.interpolate({
    inputRange: [-200, 0],
    outputRange: [1.35, 1],
    extrapolate: 'clamp',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const lat = selectedAddress?.location?.coordinates?.[1] || userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] || userLocation?.longitude;

      const isKnownWarehouse =
        isWarehouse === 'true' || id === 'flashmart' || id === 'ff-warehouse-hub' ||
        id === 'warehouse' || id?.includes('warehouse') || (!!id && id.length !== 24);

      const warehouseMerchant = {
        _id: id || 'ff-warehouse-hub',
        shopName: 'FlashFits Warehouse Hub',
        isWarehouse: true,
        isOnline: true,
        isNearby: true,
        isZoneLive: true,
        rating: 4.9,
        logo: { url: '' },
        backgroundImage: { url: '' },
        genderCategory: ['MEN', 'WOMEN', 'KIDS'],
        address: { city: 'FlashFits Hub', area: 'FlashFits Warehouse' },
      };

      if (isKnownWarehouse) {
        const whRes = await fetchWarehouseProducts(selectedGender, 1, lat, lng).catch(() => null);
        setMerchant(warehouseMerchant);
        setProducts(whRes?.cards || whRes?.data?.cards || whRes?.products || whRes?.data || []);
        setMerchantOffers([]);
        return;
      }

      const [mRes, pRes, oRes] = await Promise.all([
        fetchMerchantById(id as string, lat, lng).catch(() => null),
        fetchProductsByMerchant(id as string, lat, lng).catch(() => null),
        getMerchantOffers(id as string).catch(() => []),
      ]);

      let merchantData = mRes?.merchant || mRes?.data?.merchant;
      let isWhStore =
        !!merchantData?.isWarehouse || merchantData?.shopName?.toLowerCase().includes('warehouse');

      if (!merchantData) {
        const whRes = await fetchWarehouseProducts(selectedGender, 1, lat, lng).catch(() => null);
        setMerchant(warehouseMerchant);
        setProducts(whRes?.cards || whRes?.data?.cards || whRes?.products || whRes?.data || []);
        setMerchantOffers(oRes || []);
        return;
      }

      setMerchant(merchantData);

      let rawProducts = pRes?.products || pRes?.data || [];
      if ((!rawProducts || rawProducts.length === 0) && isWhStore) {
        const whRes = await fetchWarehouseProducts(selectedGender, 1, lat, lng).catch(() => null);
        rawProducts = whRes?.cards || whRes?.data?.cards || whRes?.products || whRes?.data || [];
      }

      setProducts(
        isWhStore
          ? rawProducts
          : rawProducts.filter((p: any) => p.source !== 'warehouse' && !p.isWarehouseListing)
      );
      setMerchantOffers(oRes || []);
    } catch (error) {
      console.error('Error fetching merchant details or products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const distanceInfo = useMemo(() => {
    if (!merchant || merchant.distanceKm === undefined) {
      return { km: '--', mins: '--', isNearby: false };
    }
    return {
      km: merchant.distanceKm.toFixed(1),
      mins: merchant.durationMins ? String(merchant.durationMins) : '25-30',
      isNearby: !!merchant.isNearby,
    };
  }, [merchant]);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id, selectedAddress, userLocation]);

  const availableGenders = useMemo(() => {
    if (!merchant?.genderCategory) return [];
    return merchant.genderCategory
      .map((g: string) => g.toUpperCase())
      .filter((g: string) => ['MEN', 'WOMEN', 'KIDS'].includes(g));
  }, [merchant]);

  useEffect(() => {
    if (availableGenders.length === 0) return;
    const globalUpper = (selectedGender as any) !== 'All' ? selectedGender.toUpperCase() : null;
    setLocalSelectedGender(
      globalUpper && availableGenders.includes(globalUpper) ? globalUpper : availableGenders[0]
    );
  }, [availableGenders, selectedGender]);

  const filteredProducts = useMemo(() => {
    if (!localSelectedGender) return products;
    return products.filter((p: any) => {
      const pGenders = Array.isArray(p.gender)
        ? p.gender.map((g: any) => g.toUpperCase())
        : [String(p.gender || '').toUpperCase()];
      return pGenders.includes(localSelectedGender) || pGenders.includes('UNISEX');
    });
  }, [products, localSelectedGender]);

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce((acc: any, p: any) => {
      const subCatId = p.subCategoryId?._id || 'others';
      const subCatName = p.subCategoryId?.name || p.subCategory || 'Others';
      const catId = p.categoryId?._id || p.categoryId;
      if (!acc[subCatId]) acc[subCatId] = { name: subCatName, products: [], categoryId: catId };
      acc[subCatId].products.push(p);
      return acc;
    }, {});
  }, [filteredProducts]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleOpenMaps = () => {
    const coords = merchant?.address?.location?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`).catch(() => {});
  };

  const handleViewAll = (subCatId: string, subCatName: string, catId?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/search-results',
      params: {
        categoryId: catId,
        subCategoryId: subCatId !== 'others' ? subCatId : undefined,
        merchantId: id,
        gender: localSelectedGender || undefined,
        title: `${subCatName} in ${merchant.shopName}`,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size={52} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Merchant not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.errorBtn}>
          <Text style={[styles.errorBtnText, { color: INK }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratingValue = merchant?.rating || '4.4';
  const reviewCount = merchant?.reviewCount ? `${merchant.reviewCount}+` : '3.8K+';
  const categoryCount = Object.keys(groupedProducts).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Sticky condensed header */}
      <Animated.View
        pointerEvents="none"
        style={[styles.stickyHeader, { paddingTop: insets.top, opacity: headerOpacity }]}
      >
        <Text style={styles.stickyTitle} numberOfLines={1}>{merchant.shopName}</Text>
      </Animated.View>

      {/* Floating actions */}
      <View style={[styles.topActionBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={19} color={INK} />
        </TouchableOpacity>
        <View style={styles.topRightActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.75}>
            <Ionicons name="search-outline" size={17} color={INK} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.75}
            onPress={() => router.push('/cart' as any)}
          >
            <Ionicons name="bag-outline" size={17} color={INK} />
            {cartCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', paddingLeft: 4 }]}>
                <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                {instantCartCount > 0 && (
                  <Ionicons name="flash" size={8} color="#fff" style={{ marginLeft: 0.5 }} />
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MUTED} />
        }
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Animated.View style={[styles.heroFill, { transform: [{ scale: heroScale }] }]}>
            {merchant.backgroundImage?.url || merchant.logo?.url ? (
              <Image
                source={{ uri: merchant.backgroundImage?.url || merchant.logo?.url }}
                style={styles.heroFill}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={['#15161A', '#232429', '#3A3B42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroFill}
              />
            )}
          </Animated.View>
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent']}
            style={styles.heroTopScrim}
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.85)', CANVAS]}
            locations={[0, 0.65, 1]}
            style={styles.heroBottomScrim}
          />
        </View>

        {/* Identity block — no card, just breathing room */}
        <View style={styles.identity}>
          <View style={styles.logoRow}>
            <View style={styles.logoWrapper}>
              {merchant.logo?.url ? (
                <Image source={{ uri: merchant.logo.url }} style={styles.storeLogo} contentFit="contain" />
              ) : (
                <View style={styles.logoFallback}>
                  <Ionicons
                    name={merchant?.isWarehouse ? 'flash' : 'storefront-outline'}
                    size={20}
                    color={INK}
                  />
                </View>
              )}
            </View>

            {merchant.isOnline && (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>OPEN NOW</Text>
              </View>
            )}
          </View>

          <Text style={styles.storeName} numberOfLines={2}>{merchant.shopName}</Text>

          <TouchableOpacity style={styles.locationRow} onPress={handleOpenMaps} activeOpacity={0.6}>
            <Text style={styles.locationText}>
              {merchant.address?.area || merchant.address?.city || 'Location'} · {distanceInfo.km} km
            </Text>
            <Ionicons name="arrow-forward" size={11} color={MUTED} />
          </TouchableOpacity>

          {/* Stat strip */}
          <View style={styles.statStrip}>
            <View style={styles.stat}>
              <View style={styles.statValueRow}>
                <Ionicons name="star" size={10} color={INK} />
                <Text style={styles.statValue}>{ratingValue}</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.stat}
              activeOpacity={0.6}
              onPress={() =>
                router.push({ pathname: '/merchant/reviews', params: { merchantId: id } } as any)
              }
            >
              <Text style={styles.statValue}>{reviewCount}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{distanceInfo.mins}m</Text>
              <Text style={styles.statLabel}>Delivery</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{distanceInfo.isNearby ? 'Try & Buy' : 'Courier'}</Text>
              <Text style={styles.statLabel}>Mode</Text>
            </View>
          </View>
        </View>

        {merchantOffers.length > 0 && (
          <View style={styles.offersWrap}>
            <MerchantCouponCarousel offers={merchantOffers} theme={theme} />
          </View>
        )}

        <MerchantCollectionBanners merchantId={id as string} theme={theme} />

        {/* Gender switcher — underline tabs */}
        {availableGenders.length > 1 && (
          <View style={styles.tabRow}>
            {availableGenders.map((gender: string) => {
              const isActive = localSelectedGender === gender;
              return (
                <TouchableOpacity
                  key={gender}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setLocalSelectedGender(gender);
                    const labelMap: Record<string, string> = { MEN: 'Men', WOMEN: 'Women', KIDS: 'Kids' };
                    setSelectedGender((labelMap[gender] || gender) as any);
                  }}
                  style={styles.tab}
                >
                  <Ionicons
                    name={GENDER_ICON_MAP[gender] || 'person'}
                    size={12}
                    color={isActive ? INK : MUTED}
                  />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {gender.charAt(0) + gender.slice(1).toLowerCase()}
                  </Text>
                  <View
                    style={[
                      styles.tabUnderline,
                      isActive && { backgroundColor: theme.primary },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Catalogue */}
        {categoryCount > 0 && (
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEyebrow}>CATALOGUE</Text>
            <Text style={styles.sectionCount}>
              {categoryCount} {categoryCount === 1 ? 'category' : 'categories'}
            </Text>
          </View>
        )}

        {Object.entries(groupedProducts).map(([subCatId, data]: [string, any]) => (
          <View key={subCatId} style={styles.categoryBlock}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleWrap}>
                <Text style={styles.categoryName}>{data.name}</Text>
                <Text style={styles.categoryMeta}>{data.products.length}</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handleViewAll(subCatId, data.name, data.categoryId)}
                style={styles.viewAllBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.viewAllText}>All</Text>
                <Ionicons name="chevron-forward" size={12} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={158}
              contentContainerStyle={styles.productListContent}
            >
              {data.products.map((p: any) => (
                <ProductCard
                  key={p._id || p.id}
                  product={p}
                  width={146}
                  containerStyle={{ marginRight: 12 }}
                  fromExplore={fromExplore === 'true'}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        {categoryCount === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-outline" size={20} color={MUTED} />
            </View>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              No products for {localSelectedGender?.toLowerCase()} at this store.
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CANVAS },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CANVAS, gap: 14 },
  errorText: { fontSize: 13, color: MUTED, fontFamily: Typography.fontFamily.medium },
  errorBtn: { borderWidth: 1, borderColor: LINE, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 100 },
  errorBtnText: { fontSize: 12, fontFamily: Typography.fontFamily.semiBold },

  stickyHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9,
    height: 96,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 68,
  },
  stickyTitle: {
    fontSize: 13,
    textAlign: 'center',
    color: INK,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: -0.1,
  },

  topActionBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.06)',
  },
  topRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    position: 'absolute', top: -1, right: -1,
    minWidth: 15, height: 15, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: CANVAS,
  },
  badgeText: { color: '#fff', fontSize: 8, fontFamily: Typography.fontFamily.bold },

  scrollContent: { paddingBottom: 56 },

  heroContainer: { height: 300, width: '100%', overflow: 'hidden', backgroundColor: '#15161A' },
  heroFill: { width: '100%', height: '100%' },
  heroTopScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  heroBottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },

  identity: { paddingHorizontal: 22, marginTop: -34 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoWrapper: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: CANVAS, padding: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: LINE,
  },
  storeLogo: { width: '100%', height: '100%', borderRadius: 14 },
  logoFallback: {
    width: '100%', height: '100%', borderRadius: 14,
    backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: LINE,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontSize: 8.5, letterSpacing: 0.8, color: INK, fontFamily: Typography.fontFamily.bold },

  storeName: {
    fontSize: 25,
    lineHeight: 30,
    marginTop: 16,
    color: INK,
    letterSpacing: -0.7,
    fontFamily: Typography.fontFamily.serifBold,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  locationText: { fontSize: 11.5, color: MUTED, fontFamily: Typography.fontFamily.medium, letterSpacing: -0.1 },

  statStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 22, paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE,
  },
  stat: { flex: 1, alignItems: 'flex-start', gap: 3 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statValue: { fontSize: 12.5, color: INK, fontFamily: Typography.fontFamily.semiBold, letterSpacing: -0.2 },
  statLabel: { fontSize: 9, color: MUTED, letterSpacing: 0.5, fontFamily: Typography.fontFamily.medium },
  statDivider: { width: StyleSheet.hairlineWidth, height: 22, backgroundColor: LINE, marginRight: 12 },

  offersWrap: { marginTop: 22, paddingHorizontal: 22 },

  tabRow: {
    flexDirection: 'row',
    marginTop: 28,
    paddingHorizontal: 22,
    gap: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 11 },
  tabText: { fontSize: 12.5, color: MUTED, fontFamily: Typography.fontFamily.semiBold, letterSpacing: -0.1 },
  tabTextActive: { color: INK },
  tabUnderline: {
    position: 'absolute', bottom: -StyleSheet.hairlineWidth, left: 0, right: 0,
    height: 1.5, borderRadius: 2, backgroundColor: 'transparent',
  },

  sectionHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 22, marginTop: 30, marginBottom: 18,
  },
  sectionEyebrow: { fontSize: 9.5, letterSpacing: 1.4, color: MUTED, fontFamily: Typography.fontFamily.bold },
  sectionCount: { fontSize: 10.5, color: MUTED, fontFamily: Typography.fontFamily.medium },

  categoryBlock: { marginBottom: 28 },
  categoryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, marginBottom: 12,
  },
  categoryTitleWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  categoryName: { fontSize: 15, color: INK, letterSpacing: -0.3, fontFamily: Typography.fontFamily.semiBold },
  categoryMeta: { fontSize: 10.5, color: MUTED, fontFamily: Typography.fontFamily.medium },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 11, color: MUTED, fontFamily: Typography.fontFamily.semiBold },
  productListContent: { paddingLeft: 22, paddingRight: 10 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 72, gap: 8 },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth, borderColor: LINE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 13, color: INK, fontFamily: Typography.fontFamily.semiBold },
  emptyText: { fontSize: 11.5, color: MUTED, fontFamily: Typography.fontFamily.medium, textAlign: 'center' },
});
