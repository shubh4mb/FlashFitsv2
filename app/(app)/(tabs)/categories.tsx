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
import { useRouter } from 'expo-router';
import { useGender } from '@/context/GenderContext';
import { fetchCategories } from '@/api/categories';
import MainHeader from '@/components/layout/MainHeader';
import { ThemedView } from '@/components/common/themed-view';
import { GenderThemes, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import Skeleton from '@/components/common/Skeleton';
import CustomRefreshControl from '@/components/common/CustomRefreshControl';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const CategoriesSkeleton = ({ headerHeight }: { headerHeight: number }) => (
  <View style={styles.container}>
    <View style={[styles.mainContent, { paddingTop: headerHeight }]}>
      <View style={styles.sidebar}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.sidebarItem}>
            <Skeleton width={65} height={80} borderRadius={12} style={{ marginBottom: 6 }} />
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
}

export default function CategoriesScreen() {
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
      const response = await fetchCategories();
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

  const mainCategories = useMemo(() => {
    const backendGender = selectedGender.toUpperCase();
    return allCategories.filter(
      c => c.level === 0 && (c.allowedGenders || (c as any).allowedGender || []).includes(backendGender)
    );
  }, [allCategories, selectedGender]);

  const subCategories = useMemo(() => {
    if (!selectedMainId) return [];
    const backendGender = selectedGender.toUpperCase();
    return allCategories.filter(
      c => c.parentId === selectedMainId && (c.allowedGenders || (c as any).allowedGender || []).includes(backendGender)
    );
  }, [allCategories, selectedMainId, selectedGender]);

  useEffect(() => {
    const isCurrentValid = mainCategories.some(c => c._id === selectedMainId);
    if (!isCurrentValid && mainCategories.length > 0) {
      setSelectedMainId(mainCategories[0]._id);
    }
  }, [selectedGender, mainCategories]);

  const handleSidebarPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMainId(id);
  };

  const getLogoUrl = (item: Category) => {
    const backendGender = selectedGender.toUpperCase() as keyof NonNullable<Category['logos']>;
    return item.logos?.[backendGender]?.url || item.logo?.url || item.image?.url;
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
                  isActive && { backgroundColor: theme.primary.slice(0, 7) + '15' } // strips 'ff' suffix from Men theme
                ]}
                onPress={() => handleSidebarPress(cat._id)}
              >
                <Image 
                  source={{ uri: getLogoUrl(cat) }} 
                  style={styles.sidebarImage} 
                  contentFit="cover"
                />
                <Text 
                  style={[
                    styles.sidebarText, 
                    isActive && { color: theme.primary, fontFamily: Typography.fontFamily.serifBold }
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
          <Animated.FlatList
            data={subCategories}
            keyExtractor={(item) => item._id}
            numColumns={2}
            key={'2_columns'}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.cardRow}
            contentContainerStyle={styles.listContent}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
            ListHeaderComponent={() => (
              <Text style={styles.sectionTitle}>
                {mainCategories.find(c => c._id === selectedMainId)?.name || 'Categories'}
              </Text>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No subcategories found</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.productCard, { width: cardSize, height: cardSize + 40 }]}
                onPress={() => handleSubcategoryPress(item.name, item._id)}
                activeOpacity={0.8}
              >
                <View style={{ position: 'relative' }}>
                  <Image 
                    source={{ uri: getLogoUrl(item) }} 
                    style={[styles.productImage, { height: cardSize }]} 
                    contentFit="cover"
                  />
                  {item.isTriable && (
                    <View style={styles.triableBadge}>
                      <Text style={styles.triableText}>Try at Home</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.productTitle} numberOfLines={2}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
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
    width: 65, 
    height: 80, 
    borderRadius: 12, 
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
  productTitle: { 
    fontSize: 12, // slightly increased for serif legibility
    textAlign: 'center', 
    paddingVertical: 6, 
    paddingHorizontal: 4,
    color: '#334155',
    fontFamily: Typography.fontFamily.serifSemiBold
  },
  triableBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  triableText: {
    color: '#FFFFFF',
    fontSize: 8,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 0.2,
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
  }
});
