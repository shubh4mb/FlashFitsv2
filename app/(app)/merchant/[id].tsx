import { fetchMerchantById } from '@/api/merchants';
import { fetchFilteredProducts } from '@/api/products';
import { Image } from 'expo-image';
import ProductCard from '@/components/common/ProductCard';
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
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const { selectedGender, setSelectedGender } = useGender();
  const { selectedAddress } = useAddress();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [localSelectedGender, setLocalSelectedGender] = useState<string | null>(null);

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
    const fetchData = async () => {
      try {
        setLoading(true);
        const [mRes, pRes] = await Promise.all([
          fetchMerchantById(id),
          fetchFilteredProducts({ selectedStores: [id] })
        ]);
        
        const merchantData = mRes?.merchant || mRes?.data?.merchant;
        setMerchant(merchantData);
        setProducts(pRes?.products || pRes?.data || []);
      } catch (error) {
        console.error('Error fetching merchant details or products:', error);
      } finally {
        setLoading(false);
      }
    };
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
      const subCatName = p.subCategory || p.subCategoryId?.name || 'Others';
      if (!acc[subCatName]) acc[subCatName] = [];
      acc[subCatName].push(p);
      return acc;
    }, {});
  }, [filteredProducts]);


  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.storeName} numberOfLines={1}>
                {merchant.shopName}
              </Text>
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

          <LinearGradient
            colors={['#F1F5F9', '#E2E8F0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.offerStrip}
          >
            <View style={styles.offerIconCircle}>
              <Ionicons name="pricetag" size={14} color={theme.primary} />
            </View>
            <Text style={[styles.offerStripText, { color: theme.primary }]}>Flat ₹175 OFF above ₹1399</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </LinearGradient>
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
        {Object.entries(groupedProducts).map(([subCatName, subProducts]: [string, any]) => (
          <View key={subCatName} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{subCatName}</Text>
              <TouchableOpacity
                style={[styles.viewAllBtn, { backgroundColor: theme.primary + '15' }]}
                activeOpacity={0.7}
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
              {subProducts.map((p: any) => (
                <ProductCard
                  key={p._id || p.id}
                  product={p}
                  width={150}
                  containerStyle={{ marginRight: 15 }}
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
      </ScrollView>
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
  offerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
  },
  offerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerStripText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.bold,
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
});
