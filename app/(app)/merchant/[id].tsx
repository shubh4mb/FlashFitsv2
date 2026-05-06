import { fetchMerchantById } from '@/api/merchants';
import { fetchFilteredProducts, fetchProductsByMerchant } from '@/api/products';
import { getMerchantOffers } from '@/api/offers';
import { Image } from 'expo-image';
import ProductCard from '@/components/common/ProductCard';
import MerchantCollectionBanners from '@/components/sections/MerchantCollectionBanners';
import { GenderThemes, Typography } from '@/constants/theme';
import { useAddress } from '@/context/AddressContext';
import { useGender } from '@/context/GenderContext';
import { calculateDistanceKm } from '@/utils/locationHelper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Loader from '@/components/common/Loader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const GENDER_ICON_MAP: Record<string, any> = {
  MEN: 'male',
  WOMEN: 'female',
  KIDS: 'happy-outline',
};

export default function MerchantDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, fromExplore } = useLocalSearchParams<{ id: string, fromExplore?: string }>();
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
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    try {
      setLoading(true);
      const lat = selectedAddress?.location?.coordinates?.[1] || userLocation?.latitude;
      const lng = selectedAddress?.location?.coordinates?.[0] || userLocation?.longitude;
      const [mRes, pRes, oRes] = await Promise.all([
        fetchMerchantById(id as string),
        fetchProductsByMerchant(id as string, lat, lng),
        getMerchantOffers(id as string)
      ]);
      
      const merchantData = mRes?.merchant || mRes?.data?.merchant;
      setMerchant(merchantData);
      setProducts(pRes?.products || pRes?.data || []);
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

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  const distanceInfo = useMemo(() => {
    if (!merchant || !selectedAddress?.location?.coordinates) {
      return { km: '2.4', mins: '25-30' };
    }
    const merchantCoords = merchant.address?.location?.coordinates;
    const userCoords = selectedAddress.location.coordinates;

    if (!merchantCoords || !userCoords) return { km: '2.4', mins: '25-30' };

    const distKm = calculateDistanceKm(
      userCoords[1], userCoords[0],
      merchantCoords[1], merchantCoords[0]
    );
    const estMins = Math.round(distKm * 3 + 10);
    return {
      km: distKm.toFixed(1),
      mins: `${estMins}-${estMins + 10}`
    };
  }, [merchant, selectedAddress]);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const availableGenders = useMemo(() => {
    if (!merchant?.genderCategory) return [];
    return merchant.genderCategory
      .map((g: string) => g.toUpperCase())
      .filter((g: string) => ['MEN', 'WOMEN', 'KIDS'].includes(g));
  }, [merchant]);

  useEffect(() => {
    if (availableGenders.length === 0) return;
    const globalUpper = (selectedGender as any) !== 'All' ? selectedGender.toUpperCase() : null;
    if (globalUpper && availableGenders.includes(globalUpper)) {
      setLocalSelectedGender(globalUpper);
    } else {
      setLocalSelectedGender(availableGenders[0]);
    }
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
  console.log(filteredProducts, 'filteredProducts');


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

  const handleViewAll = (subCatId: string, subCatName: string, catId?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/search-results',
      params: {
        categoryId: catId,
        subCategoryId: subCatId !== 'others' ? subCatId : undefined,
        merchantId: id,
        gender: localSelectedGender || undefined,
        title: `${subCatName} in ${merchant.shopName}`
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size={60} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={styles.errorContainer}>
        <Text>Merchant not found</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={{ color: theme.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratingValue = merchant?.rating || '4.4';
  const reviewCount = merchant?.reviewCount ? `${merchant.reviewCount}+` : '3.8K+';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />


      {/* Top Action Bar */}
      <View style={[styles.topActionBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.iconCircle}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topRightActions}>
          <TouchableOpacity 
            style={styles.iconCircle}
            onPress={() => router.push('/cart' as any)}
          >
            <Ionicons name="cart-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconCircle}
          >
            <Ionicons name="storefront-outline" size={20} color="#fff" />
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: merchant.backgroundImage?.url || merchant.logo.url }} 
            style={styles.heroImage} 
            contentFit="cover" 
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.7)', '#FFFFFF']}
            style={styles.heroGradientOverlay}
          />
        </View>

        {/* Store Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.logoNameRow}>
            <View style={styles.logoWrapper}>
              <Image source={{ uri: merchant.logo.url }} style={styles.storeLogo} contentFit="contain" />
              {merchant.isOnline && (
                <View style={styles.onlineDotOverlay} />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.storeName} numberOfLines={1}>
                {merchant.shopName}
              </Text>
              {merchant.isOnline && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
              <View style={styles.locationChip}>
                <Ionicons name="location" size={12} color={theme.primary} />
                <Text style={styles.locationText}>
                  {distanceInfo.km} km • {merchant.address?.city || merchant.address || 'Location'}
                </Text>
              </View>
            </View>
            <View style={[styles.ratingPill, { backgroundColor: theme.primary }]}>
              <Ionicons name="star" size={13} color="#fff" />
              <Text style={styles.ratingText}>{ratingValue}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={15} color="#64748B" />
              <Text style={styles.metaText}>{distanceInfo.mins} mins</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble-outline" size={14} color="#64748B" />
              <Text style={styles.metaText}>{reviewCount} reviews</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons name="cube-outline" size={14} color="#64748B" />
              <Text style={styles.metaText}>Try & Buy</Text>
            </View>
          </View>

          {merchantOffers.length > 0 && (
            <View style={{ marginTop: 20, gap: 12 }}>
              {merchantOffers.map((offer, idx) => (
                <View key={offer._id || idx} style={[styles.couponTicket, { backgroundColor: theme.primary + '0A', borderColor: theme.primary + '20' }]}>
                  {/* Semicircle Punches for Ticket Effect */}
                  <View style={[styles.ticketPunchLeft, { backgroundColor: '#fff', borderColor: theme.primary + '20' }]} />
                  <View style={[styles.ticketPunchRight, { backgroundColor: '#fff', borderColor: theme.primary + '20' }]} />
                  
                  <View style={styles.couponLeft}>
                    <View style={[styles.couponDot, { backgroundColor: theme.primary }]} />
                    <View style={styles.couponMain}>
                      <Text style={[styles.couponTitle, { color: theme.primary }]}>
                        {offer.title}
                      </Text>
                      <Text style={styles.couponDesc}>
                        {offer.description || (offer.conditions?.minCartValue ? `Min. ₹${offer.conditions.minCartValue}` : 'Store Offer')}
                      </Text>
                    </View>
                  </View>
                  
                  {offer.requiresCoupon && offer.couponCode && (
                    <View style={styles.couponRight}>
                      <View style={[styles.dashedDivider, { borderColor: theme.primary + '40' }]} />
                      <View style={[styles.couponCodeBadge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.couponCodeText}>{offer.couponCode}</Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <MerchantCollectionBanners merchantId={id as string} theme={theme} />
        </View>

        {/* Gender Switcher */}
        {availableGenders.length > 1 && (
          <View style={styles.genderSwitcherContainer}>
            <View style={styles.genderSwitcherTrack}>
              {availableGenders.map((gender: string) => {
                const isActive = localSelectedGender === gender;
                return (
                  <TouchableOpacity
                    key={gender}
                    onPress={() => {
                      setLocalSelectedGender(gender);
                      const labelMap: Record<string, string> = { MEN: 'Men', WOMEN: 'Women', KIDS: 'Kids' };
                      setSelectedGender((labelMap[gender] || gender) as any);
                    }}
                    style={[styles.genderTab, isActive && { backgroundColor: theme.primary }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={GENDER_ICON_MAP[gender] || 'person'}
                      size={15}
                      color={isActive ? '#fff' : '#64748B'}
                    />
                    <Text style={[styles.genderTabText, isActive && styles.genderTabTextActive]}>
                      {gender.charAt(0) + gender.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Section Title */}
        <View style={styles.sectionTitleContainer}>
          <View style={[styles.sectionTitleAccent, { backgroundColor: theme.primary }]} />
          <Text style={styles.sectionTitle}>Categories in Store</Text>
        </View>

        {/* Display Grouped Products */}
        {Object.entries(groupedProducts).map(([subCatId, data]: [string, any]) => (
          <View key={subCatId} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{data.name}</Text>
              <TouchableOpacity
                style={[styles.viewAllBtn, { backgroundColor: theme.primary + '15' }]}
                activeOpacity={0.7}
                onPress={() => handleViewAll(subCatId, data.name, data.categoryId)}
              >
                <Text style={[styles.viewAllBtnText, { color: theme.primary }]}>See all</Text>
                <Ionicons name="arrow-forward" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productListContent}
            >
              {data.products.map((p: any) => (
                <ProductCard
                  key={p._id || p.id}
                  product={p}
                  width={150}
                  containerStyle={{ marginRight: 15 }}
                  fromExplore={fromExplore === 'true'}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        {Object.keys(groupedProducts).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bag-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No products available for {localSelectedGender}</Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  topActionBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    height: 260,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  headerCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginTop: -50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 2,
  },
  storeLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  storeName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Typography.fontFamily.serifBold,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Typography.fontFamily.semiBold,
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  couponTicket: {
    minHeight: 64,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingRight: 4,
    paddingVertical: 10, // Added vertical padding for wrapped text
  },
  couponLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  couponDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  couponMain: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Typography.fontFamily.bold,
  },
  couponDesc: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: Typography.fontFamily.medium,
    marginTop: 1,
  },
  couponRight: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  dashedDivider: {
    width: 1,
    height: '60%',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginRight: 12,
  },
  couponCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  couponCodeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  ticketPunchLeft: {
    position: 'absolute',
    left: -8,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1,
  },
  ticketPunchRight: {
    position: 'absolute',
    right: -8,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1,
  },
  genderSwitcherContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  genderSwitcherTrack: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 5,
    gap: 5,
  },
  genderTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  genderTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: Typography.fontFamily.bold,
  },
  genderTabTextActive: {
    color: '#FFFFFF',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitleAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Typography.fontFamily.serifExtraBold,
  },
  categoryCard: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Typography.fontFamily.bold,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.bold,
  },
  productListContent: {
    paddingLeft: 20,
    paddingRight: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    fontFamily: Typography.fontFamily.medium,
  },
  onlineDotOverlay: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7', // Light green
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  liveText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#15803D',
    letterSpacing: 0.5,
  },
});
