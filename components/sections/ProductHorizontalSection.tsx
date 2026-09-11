import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { GenderThemes, Typography, SectionHeaderStyles } from '../../constants/theme';
import { useGender } from '../../context/GenderContext';
import { Product } from '../../utils/recentlyViewed';
import ProductCard from '../common/ProductCard';
import Skeleton from '../common/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH; // Full width
const BANNER_HEIGHT = (BANNER_WIDTH * 7) / 27;

interface ProductHorizontalSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  isLoading?: boolean;
  banner?: {
    imageUrl: string;
    actionUrl?: string;
  };
  collectionId?: string;
  slug?: string;
  campaignType?: string;
  badgeText?: string;
  theme?: any;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'newest' | 'trending';
  refreshKey?: number;
}

const ProductSectionSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <View>
        <Skeleton width={150} height={24} style={{ marginBottom: 4 }} />
        <Skeleton width={120} height={14} />
      </View>
      <Skeleton width={50} height={16} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listContent}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ marginRight: 16 }}>
          <Skeleton width={155} height={250} borderRadius={12} style={{ marginBottom: 8 }} />
          <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
          <Skeleton width={80} height={14} />
        </View>
      ))}
    </ScrollView>
  </View>
);

const ProductHorizontalSection: React.FC<ProductHorizontalSectionProps> = ({
  title,
  subtitle,
  products,
  isLoading = false,
  banner,
  collectionId,
  slug,
  campaignType,
  badgeText,
  theme: customTheme,
  sortBy,
}) => {
  const router = useRouter();
  const { selectedGender } = useGender();
  const genderTheme = GenderThemes[selectedGender] || GenderThemes.Men;

  const primaryAccent = customTheme?.primaryColor || genderTheme.primary;

  const handleNavigation = () => {
    if (slug || collectionId) {
      router.push({
        pathname: '/(app)/search-results',
        params: { 
          collectionId: collectionId || slug,
          title 
        }
      } as any);
    } else if (sortBy) {
      router.push({
        pathname: '/(app)/search-results',
        params: { sortBy, title }
      } as any);
    }
  };

  const renderItem = useCallback(({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      width={155}
      isNearby={item.isInstantBuyable || item.isNearby}
      isOnline={item.isOnline !== false}
      onPress={() => {
        router.push({
          pathname: `/(app)/product/${item._id || item.id}` as any,
          params: { 
            id: item._id || item.id, 
            fromExplore: 'false',
            variantId: item.variantId || undefined
          },
        });
      }}
    />
  ), [router]);

  if (isLoading) {
    return <ProductSectionSkeleton />;
  }

  if (!isLoading && (!products || products.length === 0)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          {badgeText ? (
            <View style={[styles.badgePill, { backgroundColor: customTheme?.primaryColor || '#CA8A04' }]}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <TouchableOpacity onPress={handleNavigation}>
          <Text style={[styles.seeAll, { color: primaryAccent }]}>View All</Text>
        </TouchableOpacity>
      </View>


      {banner && banner.imageUrl && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.bannerContainer}
          onPress={() => {
            if (banner.actionUrl) {
              router.push(banner.actionUrl as any);
            } else {
              handleNavigation();
            }
          }}
        >
          <Image
            source={{ uri: banner.imageUrl }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={300}
          />
        </TouchableOpacity>
      )}

      <FlashList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item: any, index: number) => item._id || item.id || String(index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        decelerationRate="fast"
        snapToInterval={155 + 16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: SectionHeaderStyles.title,
  subtitle: SectionHeaderStyles.subtitle,
  seeAll: SectionHeaderStyles.viewAll,
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bannerContainer: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    height: BANNER_HEIGHT,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
});

export default ProductHorizontalSection;

