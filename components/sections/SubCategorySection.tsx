import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { fetchCategories } from '../../api/categories';
import { GenderThemes, Typography } from '../../constants/theme';
import { useGender } from '../../context/GenderContext';
import Skeleton from '../common/Skeleton';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width * 0.22;

const SubCategorySkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <View>
        <Skeleton width={150} height={24} style={{ marginBottom: 4 }} />
        <Skeleton width={120} height={14} />
      </View>
      <Skeleton width={50} height={16} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listContent}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.itemContainer}>
          <Skeleton width={ITEM_SIZE} height={ITEM_SIZE} borderRadius={ITEM_SIZE / 2} style={{ marginBottom: 8 }} />
          <Skeleton width={60} height={12} />
        </View>
      ))}
    </ScrollView>
  </View>
);

export default function SubCategorySection({ refreshKey = 0 }: { refreshKey?: number }) {
  const { selectedGender, selectedSubGender } = useGender();
  const theme = GenderThemes[selectedGender] || GenderThemes.Men;

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const response = await fetchCategories();
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
  }, [refreshKey]);

  const filteredSubCategories = useMemo(() => {
    const normalizedGender = selectedGender.toUpperCase();
    return categories.filter((item) => {
      if (item.level !== 1 || item.isActive === false) return false;

      if (selectedGender === 'Kids') {
        const normalizedSubGender = selectedSubGender.toUpperCase();
        if (normalizedSubGender === 'ALL') {
          return item.allowedGenders?.includes('KIDS') || 
                 item.allowedGenders?.includes('BOYS') || 
                 item.allowedGenders?.includes('GIRLS');
        }
        return item.allowedGenders?.includes(normalizedSubGender) || 
               item.allowedGenders?.includes('KIDS');
      }

      return item.allowedGenders?.includes(normalizedGender);
    });
  }, [selectedGender, selectedSubGender, categories]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const genderKey = (selectedGender === 'Kids' && selectedSubGender !== 'All' 
      ? selectedSubGender.toUpperCase() 
      : selectedGender.toUpperCase());

    const logoUrl = item.logos?.[genderKey]?.url || 
                    (selectedGender === 'Kids' ? item.logos?.KIDS?.url : null) || 
                    item.logo?.url || 
                    item.image?.url;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.itemContainer}
        onPress={() => {
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
  }, [selectedGender, selectedSubGender, theme]);

  if (loading) {
    return <SubCategorySkeleton />;
  }

  if (error || filteredSubCategories.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            Shop by Category
          </Text>
          <Text style={styles.subtitle}>
            Curated for {selectedGender === 'Kids' && selectedSubGender !== 'All' ? selectedSubGender : selectedGender}
          </Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlashList
        data={filteredSubCategories}
        renderItem={renderItem}
        keyExtractor={(item: any, index: number) => item._id || item.id || String(index)}
        horizontal
        estimatedItemSize={100}
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
    backgroundColor: 'white',
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
    fontFamily: Typography.fontFamily.serifExtraBold,
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
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
    opacity: 0.5,
  },
  itemText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    textAlign: 'center',
    width: '100%',
  },
});
