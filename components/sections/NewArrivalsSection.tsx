import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchnewArrivalsProductsData } from '../../api/products';
import ProductCard from '../common/ProductCard';
import { useGender } from '../../context/GenderContext';
import { GenderThemes } from '../../constants/Theme';
import { Product } from '../../utils/recentlyViewed';

const NewArrivalsSection = () => {
  const router = useRouter();
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNewArrivals = async () => {
      try {
        setLoading(true);
        // Map GenderContext names to API expected names if necessary
        // SelectedGender: 'Men', 'Women', 'Kids'
        // API filters by: 'MEN', 'WOMEN', 'KIDS' usually or matches exactly
        // Based on backend controller: if (gender && gender !== 'All') filter.gender = gender;
        // So we should pass 'Men', 'Women', or 'Kids' as is, or uppercase if backend expects uppercase.
        // Let's check backend model.
        // In category model it was 'MEN', 'WOMEN', 'KIDS'.
        // In product controller it uses the query param directly.
        const apiGender = selectedGender.toUpperCase();
        
        const data = await fetchnewArrivalsProductsData(apiGender);
        setProducts(data);
      } catch (error) {
        console.error('Error loading new arrivals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNewArrivals();
  }, [selectedGender]);

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      width={180}
      onPress={() => {
        router.push({
          pathname: '/(app)/product/[id]' as any,
          params: { id: item._id || item.id },
        });
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>New Arrivals</Text>
          <Text style={styles.subtitle}>Fresh styles just for you</Text>
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
        snapToInterval={180 + 16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  loadingContainer: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
});

export default NewArrivalsSection;
