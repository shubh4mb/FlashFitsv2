import React, { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useGender } from '../../context/GenderContext';
import { GenderThemes } from '../../constants/Theme';
import { fetchCategories } from '../../api/categories';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width * 0.22;

export default function SubCategorySection() {
  const { selectedGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const response = await fetchCategories();
        // response.data handled by axiosConfig unwrapper
        setCategories(response?.categories || []);
        setError(false);
      } catch (err) {
        console.error('Failed to load categories in SubCategorySection:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  // Filter subcategories based on allowedGenders and level === 1
  const filteredSubCategories = useMemo(() => {
    const normalizedGender = selectedGender.toUpperCase();
    return categories.filter((item) =>
      item.level === 1 && 
      item.allowedGenders?.includes(normalizedGender) &&
      item.isActive !== false
    );
  }, [selectedGender, categories]);

  const renderItem = ({ item }: { item: any }) => {
    const normalizedGender = selectedGender.toUpperCase() as 'MEN' | 'WOMEN' | 'KIDS';
    // Fallback logic: logos[GENDER] -> logo -> image
    const logoUrl = item.logos?.[normalizedGender]?.url || item.logo?.url || item.image?.url;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.itemContainer}
        onPress={() => {
          /* TODO: Navigate to category products */
          console.log('Selected:', item.name);
        }}
      >
        <View style={styles.imageWrapper}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>{item.name[0]}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.itemText, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (error || filteredSubCategories.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            Shop by Category
          </Text>
          <Text style={styles.subtitle}>Curated for {selectedGender}</Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredSubCategories}
        renderItem={renderItem}
        keyExtractor={(item) => item._id || Math.random().toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={ITEM_SIZE + 16}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
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
  centerContent: {
    height: ITEM_SIZE + 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  itemContainer: {
    width: ITEM_SIZE,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  imageWrapper: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    opacity: 0.5,
  },
  itemText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});
