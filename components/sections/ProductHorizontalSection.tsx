import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { GenderThemes, Typography } from '../../constants/theme';
import { useGender } from '../../context/GenderContext';
import { Product } from '../../utils/recentlyViewed';
import ProductCard from '../common/ProductCard';
import Skeleton from '../common/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 40; // Align with section padding
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
  sortBy,
}) => {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  if (isLoading) {
    return <ProductSectionSkeleton />;
  }

  if (!isLoading && products.length === 0 && !banner) {
    return null;
  }

  const handleNavigation = () => {
    if (collectionId) {
      router.push({
        pathname: '/(app)/search-results',
        params: { collectionId, title }
      } as any);
    } else if (sortBy) {
      router.push({
        pathname: '/(app)/search-results',
        params: { sortBy, title }
      } as any);
    }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      width={155}
      onPress={() => {
        router.push({
          pathname: `/(app)/product/${item._id || item.id}` as any,
          params: { id: item._id || item.id, fromExplore: 'false' },
        });
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <TouchableOpacity onPress={handleNavigation}>
          <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
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
            placeholder={{ uri: 'https://via.placeholder.com/800x200/F0F0F0/8E8E93?text=...' }}
          />
        </TouchableOpacity>
      )}

      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
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
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 12,
    color: '#000000ff',
    marginTop: 2,
    fontFamily: Typography.fontFamily.serif,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.serif,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  bannerContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16, // Premium rounded corners
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
