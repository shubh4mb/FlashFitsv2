import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  FlatList,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { fetchCategories } from '@/api/categories';
import MainHeader from '@/components/layout/MainHeader';
import { ThemedView } from '@/components/common/themed-view';
import { BrandColors, GenderThemes, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import Skeleton from '@/components/common/Skeleton';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';
import PremiumRefreshWrapper from '@/components/common/PremiumRefreshWrapper';
import { Animated, NativeSyntheticEvent, NativeScrollEvent, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const CategoriesSkeleton = ({ headerHeight }: { headerHeight: number }) => (
  <View style={styles.container}>
    <View style={[styles.mainContent, { paddingTop: headerHeight }]}>
      <View style={styles.sidebar}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.sidebarItem}>
            <Skeleton width={56} height={56} borderRadius={8} style={{ marginBottom: 6 }} />
            <Skeleton width={50} height={12} />
          </View>
        ))}
      </View>
      <View style={styles.productsContainer}>
        <Skeleton width={100} height={20} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <Skeleton width={cardSize} height={cardSize} borderRadius={12} style={{ marginBottom: 6 }} />
              <Skeleton width={cardSize * 0.8} height={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  </View>
);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const productsAreaWidth = SCREEN_WIDTH * (2 / 3);
// Provide 24px container padding + 8px gap between 2 columns = 32px subtracted
const cardSize = (productsAreaWidth - 32) / 2; 

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
  allowedGenders: string[];
  allowedGender?: string[];
  logo?: { url: string };
  logos?: {
    MEN?: { url: string };
    WOMEN?: { url: string };
    KIDS?: { url: string };
  };
  image?: { url: string };
  isTriable?: boolean;
  hasProducts?: boolean;
  productGenders?: string[];
  productCount?: number;
}

export default function CategoriesScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { selectedGender } = useGender();
  const router = useRouter();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;
  
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    await loadCategories();
    setRefreshing(false);
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y < -80 && !refreshing) {
      onRefresh();
    }
  };

  useEffect(() => {
    loadCategories();
  }, [refreshKey]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetchCategories({ includeProductInfo: true });
      const categoriesList = response?.categories || response?.data?.categories || [];
      setAllCategories(categoriesList);

      const backendGender = selectedGender.toUpperCase();
      const initialMain = categoriesList.find(
        (c: Category) => c.level === 0 && (c.allowedGenders || (c as any).allowedGender || []).includes(backendGender)
      );
      if (initialMain) {
        setSelectedMainId(initialMain._id);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const isMatchingGender = (gendersList?: string[]) => {
    if (!gendersList || gendersList.length === 0) return false;
    const backendGender = selectedGender.toUpperCase();
    if (backendGender === 'KIDS') {
      return gendersList.some(g => ['KIDS', 'BOYS', 'GIRLS'].includes(g.toUpperCase()));
    }
    return gendersList.includes(backendGender);
  };

  const hasMatchingProduct = (cat: Category) => {
    // If backend provided productGenders array, check if current gender has products in this category
    if (cat.productGenders && cat.productGenders.length > 0) {
      return isMatchingGender(cat.productGenders);
    }
    // If hasProducts is explicitly false, it is out of stock
    if (cat.hasProducts === false) {
      return false;
    }
    return true;
  };

  const mainCategories = useMemo(() => {
    const backendGender = selectedGender.toUpperCase();
    return allCategories.filter(
      c => c.level === 0 && (c.allowedGenders || (c as any).allowedGender || []).includes(backendGender)
    );
  }, [allCategories, selectedGender]);

  const subCategories = useMemo(() => {
    if (!selectedMainId) return [];
    return allCategories.filter(c => {
      if (c.parentId !== selectedMainId) return false;
      const allowed = c.allowedGenders || (c as any).allowedGender || [];
      return isMatchingGender(allowed);
    });
  }, [allCategories, selectedMainId, selectedGender]);

  useEffect(() => {
    if (categoryId && allCategories.length > 0) {
      const target = allCategories.find(c => c._id === categoryId);
      if (target) {
        if (target.level === 0) {
          setSelectedMainId(target._id);
          return;
        } else if (target.parentId) {
          setSelectedMainId(target.parentId);
          return;
        }
      }
    }

    const isCurrentValid = mainCategories.some(c => c._id === selectedMainId);
    if (!isCurrentValid && mainCategories.length > 0) {
      setSelectedMainId(mainCategories[0]._id);
    }
  }, [categoryId, selectedGender, mainCategories, allCategories]);

  const handleSidebarPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollY.setValue(0);
    setSelectedMainId(id);
  };

  const getLogoUrl = (item: Category): string | null => {
    const backendGender = selectedGender.toUpperCase() as keyof NonNullable<Category['logos']>;
    const url = item.logos?.[backendGender]?.url || item.logo?.url || item.image?.url;
    if (typeof url === 'string' && url.trim().length > 0) {
      return url.trim();
    }
    return null;
  };

  const handleSubcategoryPress = (subCatName: string, subCategoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/search-results' as any,
      params: {
        subCategoryId: subCategoryId,
        gender: selectedGender.toUpperCase(),
      },
    });
  };

  if (loading) {
    return <CategoriesSkeleton headerHeight={headerHeight || 120} />;
  }

  return (
    <ThemedView style={styles.container}>
      <MainHeader hideCategories={true} onHeaderLayout={setHeaderHeight} refreshKey={refreshKey} />
      
      <CustomRefreshControl 
        scrollY={scrollY} 
        refreshing={refreshing} 
        onRefresh={onRefresh} 
      />

      <View style={[styles.mainContent, { paddingTop: headerHeight }]}>
        {/* Left Sidebar */}
        <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
          {mainCategories.map((cat) => {
            const isActive = selectedMainId === cat._id;
            return (
              <TouchableOpacity
                key={cat._id}
                style={[
                  styles.sidebarItem,
                  isActive && {
                    backgroundColor: BrandColors.softCyan,
                    borderWidth: 1,
                    borderLeftWidth: 1,
                    borderColor: BrandColors.softCyanBorder,
                    borderRadius: 12,
                    marginHorizontal: 6,
                  },
                ]}
                onPress={() => handleSidebarPress(cat._id)}
              >
                {getLogoUrl(cat) ? (
                  <Image 
                    source={{ uri: getLogoUrl(cat)! }} 
                    style={styles.sidebarImage} 
                    contentFit="contain"
                    recyclingKey={cat._id}
                  />
                ) : (
                  <View style={[styles.sidebarImage, styles.placeholderImageContainer]}>
                    <Ionicons name="shirt-outline" size={24} color="#CBD5E1" />
                  </View>
                )}
                <Text 
                  style={[
                    styles.sidebarText, 
                    isActive && { color: BrandColors.matteBlack, fontFamily: Typography.fontFamily.bold, fontWeight: '700' }
                  ]} 
                  numberOfLines={2}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Right Content - 2 Column Grid */}
        <View style={styles.productsContainer}>
        <PremiumRefreshWrapper
          scrollY={scrollY}
          refreshing={refreshing}
          onRefresh={onRefresh}
        >
          <AnimatedFlashList
            key={selectedMainId || 'subcat_grid'}
            extraData={selectedMainId}
            data={subCategories}
            keyExtractor={(item: any) => `${selectedMainId}_${item._id}`}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            scrollEventThrottle={16}
            ListHeaderComponent={() => (
              <View style={{ marginBottom: 14 }}>
                {/* Promo Card matching design mockup */}
                <LinearGradient
                  colors={[BrandColors.softCyan, '#DDF8FB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerCard}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.bannerTitle}>Upgrade Your Everyday Style</Text>
                    <TouchableOpacity
                      style={styles.bannerBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        const currentCat = mainCategories.find(c => c._id === selectedMainId);
                        if (currentCat) {
                          router.push({
                            pathname: '/search-results' as any,
                            params: { q: currentCat.name, gender: selectedGender.toUpperCase() },
                          });
                        }
                      }}
                    >
                      <Text style={styles.bannerBtnText}>EXPLORE NOW</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

                <Text style={styles.sectionTitle}>
                  {mainCategories.find(c => c._id === selectedMainId)?.name || 'Categories'}
                </Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No subcategories found</Text>
              </View>
            )}
            renderItem={({ item, index }: { item: any, index: number }) => {
              const isAvailable = hasMatchingProduct(item);
              const logoUrl = getLogoUrl(item);

              return (
                <TouchableOpacity
                  style={[
                    styles.productCard, 
                    { 
                      width: cardSize, 
                      height: cardSize + 40,
                      marginBottom: 16,
                      marginLeft: index % 2 === 1 ? 8 : 0,
                      opacity: isAvailable ? 1 : 0.5,
                    }
                  ]}
                  disabled={!isAvailable}
                  onPress={() => handleSubcategoryPress(item.name, item._id)}
                  activeOpacity={0.8}
                >
                  <View style={{ position: 'relative' }}>
                    {logoUrl ? (
                      <Image 
                        source={{ uri: logoUrl }} 
                        recyclingKey={`${item._id}_${selectedGender}_${selectedMainId}`}
                        style={[styles.productImage, { height: cardSize }]} 
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View style={[styles.productImage, styles.placeholderImageContainer, { height: cardSize }]}>
                        <Ionicons name="shirt-outline" size={cardSize * 0.35} color="#CBD5E1" />
                      </View>
                    )}
                    {!isAvailable && (
                      <View style={styles.disabledBadge}>
                        <Text style={styles.disabledBadgeText}>OUT OF STOCK</Text>
                      </View>
                    )}
                  </View>
                  <Text 
                    style={[
                      styles.productTitle,
                      !isAvailable && { color: '#94A3B8' }
                    ]} 
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </PremiumRefreshWrapper>
        </View>
      </View>
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
  mainContent: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF',
  },
  
  // Sidebar
  sidebar: { 
    flex: 1, 
    // backgroundColor: '#FFFFFF', 
    borderRightWidth: 1, 
    borderColor: '#EEEEEE', 
    paddingVertical: 10 
  },
  sidebarItem: { 
    alignItems: 'center', 
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarImage: { 
    width: 56, 
    height: 56, 
    borderRadius: 8, 
    marginBottom: 6, 
    // backgroundColor: '#F8F8F8' 
  },
  sidebarText: { 
    fontSize: 12, // slightly increased for serif legibility
    color: '#444444', 
    textAlign: 'center', 
    paddingHorizontal: 4,
    fontFamily: Typography.fontFamily.serifMedium,
  },

  // Grid
  productsContainer: { 
    flex: 2, 
    padding: 12,
    backgroundColor: '#FFFFFF'
  },
  listContent: { 
    paddingBottom: 150 
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.serifBold,
    marginBottom: 16,
    color: '#1E293B',
    paddingHorizontal: 4,
  },
  cardRow: { 
    justifyContent: 'flex-start',
    gap: 8, // 8px gap between two cards
    marginBottom: 16 
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
  },
  placeholderImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productTitle: { 
    fontSize: 12, // slightly increased for serif legibility
    textAlign: 'center', 
    paddingVertical: 6, 
    paddingHorizontal: 4,
    color: '#334155',
    fontFamily: Typography.fontFamily.serifSemiBold
  },

  bannerCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BrandColors.softCyanBorder,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.extraBold,
    color: BrandColors.matteBlack,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  bannerBtn: {
    backgroundColor: BrandColors.matteBlack,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
  },
  disabledBadge: {
    position: 'absolute',
    bottom: 6,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.5,
  }
});
