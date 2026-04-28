import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GenderThemes, Typography } from '../../constants/theme';
import { useGender } from '../../context/GenderContext';
import { getRecentlyViewed, Product } from '../../utils/recentlyViewed';
import ProductCard from '../common/ProductCard';
import Skeleton from '../common/Skeleton';
import { ScrollView } from 'react-native';

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

const RecentlyViewedSection = ({ refreshKey = 0 }: { refreshKey?: number }) => {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentlyViewed = async () => {
      try {
        setLoading(true);
        const data = await getRecentlyViewed();
        setProducts(data);
        console.log(data, "recently viewed");
      } catch (error) {
        console.error('Error loading recently viewed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentlyViewed();
  }, [refreshKey]);

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      width={155}
      onPress={() => {
        router.push({
          pathname: '/(app)/product/[id]' as any,
          params: { id: item._id || item.id },
        });
      }}
    />
  );

  if (loading) {
    return <ProductSectionSkeleton />;
  }

  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recently Viewed</Text>
          <Text style={styles.subtitle}>Pick up where you left off</Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>

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
    color: '#64748B',
    marginTop: 2,
    fontFamily: Typography.fontFamily.medium,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
});

export default RecentlyViewedSection;
